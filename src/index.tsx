/* @refresh reload */
import { render } from 'solid-js/web';
import { HashRouter, Route } from '@solidjs/router';
import App from './App';
import Timesheet from './pages/Timesheet';
import Export from './pages/Export';
import Settings from './pages/Settings';
import { initDb } from './db/sqlite';
import './styles/themes.css';
import './styles/global.css';

initDb();

render(
  () => (
    <HashRouter>
      <Route path="/" component={App}>
        <Route path="/" component={Timesheet} />
        <Route path="/export" component={Export} />
        <Route path="/settings" component={Settings} />
      </Route>
    </HashRouter>
  ),
  document.getElementById('root')!
);
