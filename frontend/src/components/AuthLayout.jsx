import hero from '../assets/login-hero.jpg';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth">
      <main className="auth-form">
        <div className="logo">
            <span>🌿 AgriVision</span>
            <small>Satellite insights. Smarter farming.</small>
        </div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
      </main>
      <aside className="auth-hero" style={{ backgroundImage: `url(${hero})` }} aria-hidden="true" >
      </aside>
    </div>
  );
}