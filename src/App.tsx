import { A } from '@solidjs/router';
import ThemeToggle from './components/ThemeToggle';

export default function App(props: { children?: any }) {
  return (
    <>
      <nav class="top-nav">
        <span class="nav-brand">Timesheet</span>
        <div class="nav-links-group">
          <A class="nav-link" href="/" end data-label="Timesheet"><span>Timesheet</span></A>
          <A class="nav-link" href="/export" data-label="Export"><span>Export</span></A>
          <A class="nav-link" href="/settings" data-label="Settings"><span>Settings</span></A>
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
