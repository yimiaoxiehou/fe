/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import React from 'react';
import { Switch, Route, useLocation, Redirect } from 'react-router-dom';
import querystring from 'query-string';
import NotFound from '@/pages/notFound';
import Page403 from '@/pages/notFound/Page403';
import { List as Dashboard, Detail as DashboardDetail, Share as DashboardShare } from '@/pages/dashboard';
// @ts-ignore
import plusLoader from 'plus:/utils/loader';
import { dynamicPackages, Entry } from '@/utils';

const Packages = dynamicPackages();
let lazyRoutes = Packages.reduce((result: any, module: Entry) => {
  return (result = result.concat(module.routes));
}, []);

function RouteWithSubRoutes(route) {
  return (
    <Route
      path={route.path}
      render={(props) => (
        // pass the sub-routes down to keep nesting
        <route.component {...props} routes={route.routes} />
      )}
    />
  );
}

export default function Content() {
  const location = useLocation();
  // 仪表盘在全屏和暗黑主题下需要定义个 dark 样式名
  let themeClassName = '';
  if (location.pathname.indexOf('/dashboard') === 0) {
    const query = querystring.parse(location.search);
    query.themeMode = 'dark';
    query.viewMode = 'fullscreen';
    themeClassName = 'theme-dark';
    if (query?.viewMode === 'fullscreen' && query?.themeMode === 'dark') {
      themeClassName = 'theme-dark';
    }
  }

  return (
    <div className={`content ${themeClassName}`}>
      <Switch>
        <Route path='/dashboard/:id' exact component={DashboardDetail} />
        <Route path='/dashboards/:id' exact component={DashboardDetail} />
        <Route path='/dashboards/share/:id' component={DashboardShare} />
        <Route path='/dashboards' component={Dashboard} />
        <Route path='/' exact>
          <Redirect to='/dashboards' />
        </Route>
        <Route path='/403' component={Page403} />
        <Route path='/404' component={NotFound} />
        <Route path='*' component={NotFound} />
      </Switch>
    </div>
  );
}
