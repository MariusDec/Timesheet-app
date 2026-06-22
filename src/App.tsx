import { A } from '@solidjs/router';
import ThemeToggle from './components/ThemeToggle';

export default function App(props: { children?: any }) {
  return (
    <>
      <nav class="top-nav">
        <span class="nav-brand">Timesheet</span>
        <div class="nav-links-group">
          <A class="nav-link" href="/" end>Timesheet</A>
          <A class="nav-link" href="/export">Export</A>
          <A class="nav-link" href="/settings">Settings</A>
        </div>
        <span class="nav-spacer" />
        <ThemeToggle />
      </nav>

      <main class="main-content">
        {props.children}
      </main>
    </>
  );
}
