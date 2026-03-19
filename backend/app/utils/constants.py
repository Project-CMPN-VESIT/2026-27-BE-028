"""
Constants for satellite collision avoidance decision system.

This module contains physics constants, operational thresholds, and cost function weights
used throughout the decision system.
"""

# ============================================
# PHYSICS CONSTANTS
# ============================================

# Gravitational parameter (Earth)
MU_EARTH = 398600.4418  # km^3/s^2

# Earth radius
EARTH_RADIUS = 6378.137  # km

# Speed of light
C = 299792.458  # km/s

# ============================================
# OPERATIONAL THRESHOLDS
# ============================================

# Critical collision probability threshold (NASA standard)
# If Pc exceeds this, immediate action required
CRITICAL_PC_THRESHOLD = 1e-4  # 1 in 10,000

# Medium risk collision probability threshold
MEDIUM_PC_THRESHOLD = 1e-5  # 1 in 100,000

# Minimum time before TCA to guarantee maneuver execution (hours)
MINIMUM_MANEUVER_TIME = 2.0

# Critical time threshold for forced commitment (hours)
CRITICAL_TIME_THRESHOLD = 6.0

# Maximum available fuel capacity for maneuvers (m/s)
MAX_FUEL_CAPACITY = 50.0

# Minimum fuel reserve that must be maintained (m/s)
MIN_FUEL_RESERVE = 5.0

# ============================================
# COST FUNCTION WEIGHTS
# ============================================

# Alpha: Weight for Delta-V cost in acting cost
# Higher value makes fuel consumption more expensive
ALPHA = 1.0

# Beta: Weight for collision risk in acting cost
# Higher value makes collision risk more expensive
BETA = 100000.0

# Gamma: Weight for uncertainty in waiting cost
# Higher value makes uncertainty more expensive
GAMMA = 50.0

# Delta: Weight for feasibility loss in waiting cost
# Higher value makes waiting more expensive
DELTA = 100.0

# ============================================
# UNCERTAINTY MODEL PARAMETERS
# ============================================

# Uncertainty decay rate (how fast uncertainty decreases with better observations)
UNCERTAINTY_DECAY_RATE = 0.05  # per hour

# Base uncertainty multiplier
BASE_UNCERTAINTY_FACTOR = 1.0

# Minimum uncertainty floor (uncertainty never goes below this)
MIN_UNCERTAINTY = 0.01

# ============================================
# SIMULATION PARAMETERS
# ============================================

# Simulation time step (seconds)
SIMULATION_TIME_STEP = 60.0  # 1 minute

# Number of Monte Carlo samples for uncertainty propagation
MC_SAMPLES = 100

# Propagation accuracy tolerance
PROPAGATION_TOLERANCE = 1e-6

# Maximum miss distance considered safe (meters)
SAFE_MISS_DISTANCE = 5000.0

# ============================================
# FEASIBILITY PARAMETERS
# ============================================

# Delta-V growth rate over time (additional m/s per hour of delay)
# Accounts for orbital mechanics making maneuvers more expensive
DELTA_V_GROWTH_RATE = 0.001  # m/s per hour

# Feasibility loss exponential factor
# Models increasing difficulty of maneuvering as TCA approaches
FEASIBILITY_LOSS_FACTOR = 2.0

# ============================================
# SAFETY MARGINS
# ============================================

# Safety margin multiplier for Delta-V calculations
DELTA_V_SAFETY_MARGIN = 1.2  # 20% safety margin

# Position uncertainty multiplier for collision detection
POSITION_UNCERTAINTY_MULTIPLIER = 3.0  # 3-sigma

# ============================================
# DECISION THRESHOLDS
# ============================================

# Cost difference threshold for making a decision
# If |C_act - C_wait| < threshold, decision is ambiguous
DECISION_THRESHOLD = 0.1

# Minimum confidence level for decision (0-1)
MIN_CONFIDENCE = 0.8

# ============================================
# CAUSAL REASONING PARAMETERS
# ============================================

# Time horizon for causal simulation (hours)
CAUSAL_TIME_HORIZON = 12.0

# Number of timesteps in causal simulation
CAUSAL_TIMESTEPS = 12

# Risk increase tolerance (%)
RISK_INCREASE_TOLERANCE = 5.0

# ============================================
# VISUALIZATION PARAMETERS
# ============================================

# Number of points in time series plots
PLOT_POINTS = 50

# Forecast horizon for visualization (hours)
FORECAST_HORIZON = 24.0

# ============================================
# DATA VALIDATION
# ============================================

# Maximum reasonable relative velocity (km/s)
MAX_RELATIVE_VELOCITY = 20.0

# Maximum reasonable collision probability
MAX_COLLISION_PROBABILITY = 1.0

# Minimum position covariance (meters)
MIN_COVARIANCE = 0.1

# Maximum position covariance (meters)
MAX_COVARIANCE = 10000.0
