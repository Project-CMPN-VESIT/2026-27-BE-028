import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

# ============================================================
# 1. SATELLITE GRU
# ============================================================
class SatelliteGRU(nn.Module):
    def __init__(self, input_size: int = 33, hidden_size: int = 128, num_layers: int = 2, dropout: float = 0.3):
        super().__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.gru = nn.GRU(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        self.classifier = nn.Sequential(
            nn.LayerNorm(hidden_size),
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 2)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.gru(x)
        logits = self.classifier(out)
        return logits


# ============================================================
# 2. SATELLITE LSTM
# ============================================================
class SatelliteLSTM(nn.Module):
    def __init__(self, input_size: int = 33, hidden_size: int = 128, num_layers: int = 2, dropout: float = 0.3, bidirectional: bool = False):
        super().__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.bidirectional = bidirectional
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
            bidirectional=bidirectional
        )
        self.classifier = nn.Sequential(
            nn.LayerNorm(hidden_size),
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 2)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        logits = self.classifier(out)
        return logits


# ============================================================
# 3. SATELLITE TCN
# ============================================================
class CausalConv(nn.Module):
    def __init__(self, cin: int, cout: int, k: int, d: int):
        super().__init__()
        self.pad = (k - 1) * d
        self.conv = nn.Conv1d(cin, cout, k, dilation=d)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.conv(F.pad(x, (self.pad, 0)))


class TCNBlock(nn.Module):
    def __init__(self, cin: int, cout: int, k: int, d: int, drop: float = 0.30):
        super().__init__()
        self.c1 = CausalConv(cin, cout, k, d)
        self.n1 = nn.BatchNorm1d(cout)
        self.a1 = nn.GELU()
        self.d1 = nn.Dropout(drop)
        self.c2 = CausalConv(cout, cout, k, d)
        self.n2 = nn.BatchNorm1d(cout)
        self.a2 = nn.GELU()
        self.d2 = nn.Dropout(drop)
        self.skip = nn.Conv1d(cin, cout, 1) if cin != cout else nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        r = self.skip(x)
        x = self.d1(self.a1(self.n1(self.c1(x))))
        x = self.d2(self.a2(self.n2(self.c2(x))))
        return x + r


class SatelliteTCN(nn.Module):
    def __init__(self, n_features: int = 33):
        super().__init__()
        self.tcn = nn.Sequential(
            TCNBlock(n_features, 32, 3, 1),
            TCNBlock(32, 64, 3, 2),
            TCNBlock(64, 64, 3, 4),
            TCNBlock(64, 32, 3, 8)
        )
        self.head = nn.Conv1d(32, 2, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x input: (batch, seq_len, features) -> conv1d expects (batch, features, seq_len)
        x = x.permute(0, 2, 1)
        out = self.head(self.tcn(x))
        return out.permute(0, 2, 1)


# ============================================================
# 4. SATELLITE CAUSAL TRANSFORMER
# ============================================================
class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 20):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-np.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.pe[:, :x.size(1)]


class SatelliteCausalTransformer(nn.Module):
    def __init__(
        self,
        input_size: int = 33,
        d_model: int = 128,
        n_heads: int = 4,
        num_layers: int = 2,
        ff_dim: int = 256,
        dropout: float = 0.3,
        max_len: int = 20
    ):
        super().__init__()
        self.input_projection = nn.Linear(input_size, d_model)
        self.positional_encoding = PositionalEncoding(d_model, max_len)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=ff_dim,
            dropout=dropout,
            batch_first=True
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.classifier = nn.Sequential(
            nn.LayerNorm(d_model),
            nn.Linear(d_model, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 2)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        seq_len = x.size(1)
        mask = nn.Transformer.generate_square_subsequent_mask(seq_len).to(x.device)
        x = self.input_projection(x)
        x = self.positional_encoding(x)
        x = self.transformer_encoder(x, mask=mask, is_causal=True)
        logits = self.classifier(x)
        return logits


# ============================================================
# 5. PATCHTST
# ============================================================
class PatchTST(nn.Module):
    def __init__(
        self,
        num_features: int = 44,
        seq_len: int = 20,
        patch_len: int = 5,
        stride: int = 2,
        d_model: int = 128,
        n_heads: int = 4,
        n_layers: int = 3,
        dropout: float = 0.2
    ):
        super().__init__()
        self.patch_len = patch_len
        self.stride = stride
        self.num_patches = ((seq_len - patch_len) // stride) + 1
        self.patch_projection = nn.Linear(patch_len, d_model)
        self.channel_embedding = nn.Parameter(torch.randn(1, num_features, 1, d_model))
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dropout=dropout,
            batch_first=True,
            norm_first=True
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers, enable_nested_tensor=False)
        self.norm = nn.LayerNorm(d_model)
        self.classifier = nn.Linear(num_features * d_model, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, time, features)
        x = x.transpose(1, 2) # (batch, features, time)
        patches = x.unfold(dimension=-1, size=self.patch_len, step=self.stride) # (batch, features, patches, patch_len)
        patches = self.patch_projection(patches) # (batch, features, patches, d_model)
        patches = patches + self.channel_embedding[:, :, :self.num_patches, :]
        batch_size = patches.size(0)
        patches = patches.reshape(batch_size, self.num_features_for_model(), self.num_patches, -1)
        patches = patches.reshape(batch_size * patches.size(1), self.num_patches, -1)
        encoded = self.encoder(patches)
        encoded = self.norm(encoded)
        encoded = encoded[:, -1, :] # final patch slice
        encoded = encoded.reshape(batch_size, -1)
        logits = self.classifier(encoded)
        return logits

    def num_features_for_model(self) -> int:
        return self.channel_embedding.size(1)
