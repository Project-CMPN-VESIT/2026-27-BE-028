from model_service import get_model_service

s = get_model_service()
print("Commit events (first 10):", s.commit_event_ids[:10])
print("Wait events (first 10):", s.wait_event_ids[:10])

c_id = s.commit_event_ids[0]
res = s.evaluate_event(c_id)
print(f"\n--- Commit Event {c_id} (Dataset label = COMMIT) ---")
print(f"Overall Decision: {res['decision']}, Confidence: {res['confidence']}%")
for m in res['all_models']:
    print(f"  {m['model_name']:12s}: raw={m['raw_prediction']:6s} prob_commit={m['commit_probability']:.4f} prob_wait={m['wait_probability']:.4f} final={m['final_prediction']:6s}")

print(f"\nTimestep 0 for event {c_id}:")
for name, m in res['timesteps'][0]['models'].items():
    print(f"  {name:12s}: prob_commit={m['prob_commit']:.4f} decision={m['final']}")

print(f"\nTimestep 19 for event {c_id}:")
for name, m in res['timesteps'][19]['models'].items():
    print(f"  {name:12s}: prob_commit={m['prob_commit']:.4f} decision={m['final']}")
