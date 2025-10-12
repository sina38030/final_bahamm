export default function DebugPage() {
  return (
    <div style={{ padding: 24, fontFamily: 'var(--font-iransans), Tahoma, sans-serif' }}>
      <h1>Debug OK</h1>
      <p>Status: 200</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
}


