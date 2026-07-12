export function StatusBar() {
  return (
    <div className="status-bar">
      <span>9:41</span>
      <span className="status-icons">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 19v-3M9 19v-6M14 19v-9M19 19V5" />
        </svg>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5a15 15 0 0118 0" />
          <path d="M6.2 12a10.5 10.5 0 0111.6 0" />
          <path d="M9.5 15.5a5.8 5.8 0 015 0" />
          <circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none" />
        </svg>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="17" height="10" rx="2" />
          <path d="M21.5 10.2v3.6" />
          <rect x="4" y="9" width="10" height="6" fill="currentColor" stroke="none" />
        </svg>
      </span>
    </div>
  );
}
