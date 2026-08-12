export default function Header({ onLogout }) {
  return (
    <div className="header">
      <div className="brand-mark">
        <span className="brand-dot"></span>TIME TRACKER
      </div>
      <button onClick={onLogout}>Log Out</button>
    </div>
  );
}
