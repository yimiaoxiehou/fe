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
import React, { useState, useRef, useEffect, useContext } from 'react';
import _ from 'lodash';
import semver from 'semver';
import { useTranslation } from 'react-i18next';
import { useInterval } from 'ahooks';
import { v4 as uuidv4 } from 'uuid';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { Alert, Modal, Button } from 'antd';
import PageLayout from '@/components/pageLayout';
import { IRawTimeRange, getDefaultValue } from '@/components/TimeRangePicker';
import { Dashboard } from '@/store/dashboardInterface';
import { getDashboard, updateDashboardConfigs, getDashboardPure, getBuiltinDashboard } from '@/services/dashboardV2';
import { SetTmpChartData } from '@/services/metric';
import { CommonStateContext } from '@/App';
import MigrationModal from '@/pages/help/migrate/MigrationModal';
import VariableConfig, { IVariable } from '../VariableConfig';
import { replaceExpressionVars } from '../VariableConfig/constant';
import { ILink } from '../types';
import Panels from '../Panels';
import Title from './Title';
import { JSONParse } from '../utils';
import Editor from '../Editor';
import { defaultCustomValuesMap, defaultOptionsValuesMap } from '../Editor/config';
import { sortPanelsByGridLayout, panelsMergeToConfigs, updatePanelsInsertNewPanelToGlobal } from '../Panels/utils';
import { useGlobalState } from '../globalState';
import './style.less';
import './dark.antd.less';
import './dark.less';

interface URLParam {
  id: string;
}

interface IProps {
  isPreview?: boolean;
  isBuiltin?: boolean;
  gobackPath?: string;
  builtinParams?: any;
  onLoaded?: (dashboard: Dashboard['configs']) => boolean;
}

export const dashboardTimeCacheKey = 'dashboard-timeRangePicker-value';
const fetchDashboard = ({ id, builtinParams }) => {
  if (builtinParams) {
    return getBuiltinDashboard(builtinParams);
  }
  return getDashboard(id);
};
const builtinParamsToID = (builtinParams) => {
  return `${builtinParams['__built-in-cate']}_${builtinParams['__built-in-name']}`;
};

export default function DetailV2(props: IProps) {
  const { isPreview = false, isBuiltin = false, gobackPath, builtinParams } = props;
  const { t, i18n } = useTranslation('dashboard');
  const history = useHistory();
  const { datasourceList, profile } = useContext(CommonStateContext);
  const roles = _.get(profile, 'roles', []);
  const isAuthorized = !_.some(roles, (item) => item === 'Guest') && !isPreview;
  const [dashboardMeta, setDashboardMeta] = useGlobalState('dashboardMeta');
  let { id } = useParams<URLParam>();
  if (isBuiltin) {
    const query = queryString.parse(useLocation().search);
    id = builtinParamsToID(query);
  }
  const refreshRef = useRef<{ closeRefresh: Function }>();
  const [dashboard, setDashboard] = useState<Dashboard>({} as Dashboard);
  const [variableConfig, setVariableConfig] = useState<IVariable[]>();
  const [variableConfigWithOptions, setVariableConfigWithOptions] = useState<IVariable[]>();
  const [dashboardLinks, setDashboardLinks] = useState<ILink[]>();
  const [panels, setPanels] = useState<any[]>([]);
  const [range, setRange] = useState<IRawTimeRange>(
    getDefaultValue(dashboardTimeCacheKey, {
      start: 'now-1h',
      end: 'now',
    }),
  );
  const [editable, setEditable] = useState(true);
  const [editorData, setEditorData] = useState({
    visible: false,
    id: '',
    initialValues: {} as any,
  });
  const [migrationVisible, setMigrationVisible] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  let updateAtRef = useRef<number>();
  const refresh = async (cbk?: () => void) => {
    fetchDashboard({
      id,
      builtinParams,
    }).then((res) => {
      updateAtRef.current = res.update_at;
      const configs = _.isString(res.configs) ? JSONParse(res.configs) : res.configs;
      if (props.onLoaded && !props.onLoaded(configs)) {
        return;
      }
      if ((!configs.version || semver.lt(configs.version, '3.0.0')) && !builtinParams) {
        setMigrationVisible(true);
      }
      setDashboard({
        ...res,
        configs,
      });
      if (configs) {
        // TODO: configs 中可能没有 var 属性会导致 VariableConfig 报错
        const variableConfig = configs.var
          ? configs
          : {
              ...configs,
              var: [],
            };
        setVariableConfig(
          _.map(variableConfig.var, (item) => {
            return _.omit(item, 'options'); // 兼容性代码，去除掉已保存的 options
          }) as IVariable[],
        );
        setDashboardLinks(configs.links);
        setPanels(sortPanelsByGridLayout(configs.panels));
        if (cbk) {
          cbk();
        }
      }
    });
  };
  const handleUpdateDashboardConfigs = (id, configs) => {
    updateDashboardConfigs(id, configs).then((res) => {
      updateAtRef.current = res.update_at;
      refresh();
    });
  };
  const handleVariableChange = (value, b, valueWithOptions) => {
    const dashboardConfigs: any = dashboard.configs;
    dashboardConfigs.var = value;
    // 更新变量配置
    b && handleUpdateDashboardConfigs(dashboard.id, { configs: JSON.stringify(dashboardConfigs) });
    // 更新变量配置状态
    if (valueWithOptions) {
      setVariableConfigWithOptions(valueWithOptions);
      setDashboardMeta({
        dashboardId: _.toString(id),
        variableConfigWithOptions: valueWithOptions,
      });
    }
  };
  const stopAutoRefresh = () => {
    refreshRef.current?.closeRefresh();
  };

  useEffect(() => {
    refresh();
  }, [id]);

  useInterval(() => {
    if (import.meta.env.PROD && dashboard.id) {
      getDashboardPure(_.toString(dashboard.id)).then((res) => {
        if (updateAtRef.current && res.update_at > updateAtRef.current) {
          if (editable) setEditable(false);
        } else {
          setEditable(true);
        }
      });
    }
  }, 2000);

  return (
    <PageLayout
      customArea={
        <Title
          isPreview={isPreview}
          isBuiltin={isBuiltin}
          isAuthorized={isAuthorized}
          gobackPath={gobackPath}
          dashboard={dashboard}
          range={range}
          setRange={(v) => {
            setRange(v);
          }}
          onAddPanel={(type) => {
            if (type === 'row') {
              const newPanels = updatePanelsInsertNewPanelToGlobal(
                panels,
                {
                  type: 'row',
                  id: uuidv4(),
                  name: i18n.language === 'en_US' ? 'Row' : '分组',
                  collapsed: true,
                },
                'row',
              );
              setPanels(newPanels);
              handleUpdateDashboardConfigs(dashboard.id, {
                configs: panelsMergeToConfigs(dashboard.configs, newPanels),
              });
            } else {
              setEditorData({
                visible: true,
                id: uuidv4(),
                initialValues: {
                  name: 'Panel Title',
                  type,
                  targets: [
                    {
                      refId: 'A',
                      expr: '',
                    },
                  ],
                  custom: defaultCustomValuesMap[type],
                  options: defaultOptionsValuesMap[type],
                },
              });
            }
          }}
        />
      }
    >
      <div className='dashboard-detail-container'>
        <div className='dashboard-detail-content'>
          {!editable && (
            <div style={{ padding: '5px 10px' }}>
              <Alert type='warning' message='仪表盘已经被别人修改，为避免相互覆盖，请刷新仪表盘查看最新配置和数据' />
            </div>
          )}
          <div className='dashboard-detail-content-header'>
            <div className='variable-area'>
              {variableConfig && (
                <VariableConfig isPreview={!isAuthorized} onChange={handleVariableChange} value={variableConfig} range={range} id={id} onOpenFire={stopAutoRefresh} />
              )}
            </div>
          </div>
          {variableConfigWithOptions && (
            <Panels
              dashboardId={id}
              isPreview={isPreview}
              editable={editable}
              panels={panels}
              setPanels={setPanels}
              dashboard={dashboard}
              range={range}
              variableConfig={variableConfigWithOptions}
              onShareClick={(panel) => {
                const curDatasourceValue = replaceExpressionVars(panel.datasourceValue, variableConfigWithOptions, variableConfigWithOptions.length, id);
                const serielData = {
                  dataProps: {
                    ...panel,
                    datasourceValue: curDatasourceValue,
                    // @ts-ignore
                    datasourceName: _.find(datasourceList, { id: curDatasourceValue })?.name,
                    targets: _.map(panel.targets, (target) => {
                      const realExpr = variableConfigWithOptions
                        ? replaceExpressionVars(target.expr, variableConfigWithOptions, variableConfigWithOptions.length, id)
                        : target.expr;
                      return {
                        ...target,
                        expr: realExpr,
                      };
                    }),
                    range,
                  },
                };
                SetTmpChartData([
                  {
                    configs: JSON.stringify(serielData),
                  },
                ]).then((res) => {
                  const ids = res.dat;
                  window.open('/chart/' + ids);
                });
              }}
              onUpdated={(res) => {
                updateAtRef.current = res.update_at;
                refresh();
              }}
            />
          )}
        </div>
      </div>
      <Editor
        mode='add'
        visible={editorData.visible}
        setVisible={(visible) => {
          setEditorData({
            ...editorData,
            visible,
          });
        }}
        variableConfigWithOptions={variableConfigWithOptions}
        id={editorData.id}
        dashboardId={id}
        time={range}
        initialValues={editorData.initialValues}
        onOK={(values) => {
          const newPanels = updatePanelsInsertNewPanelToGlobal(panels, values, 'chart');
          setPanels(newPanels);
          handleUpdateDashboardConfigs(dashboard.id, {
            configs: panelsMergeToConfigs(dashboard.configs, newPanels),
          });
        }}
      />
      {/*迁移*/}
      <Modal
        title='迁移大盘'
        visible={migrationVisible}
        onCancel={() => {
          setMigrationVisible(false);
        }}
        footer={[
          <Button
            key='cancel'
            danger
            onClick={() => {
              setMigrationVisible(false);
              handleUpdateDashboardConfigs(dashboard.id, {
                configs: JSON.stringify({
                  ...dashboard.configs,
                  version: '3.0.0',
                }),
              });
            }}
          >
            关闭并不再提示
          </Button>,
          <Button
            key='batchMigrate'
            type='primary'
            ghost
            onClick={() => {
              history.push('/help/migrate');
            }}
          >
            前往批量迁移大盘
          </Button>,
          <Button
            key='migrate'
            type='primary'
            onClick={() => {
              setMigrationVisible(false);
              setMigrationModalOpen(true);
            }}
          >
            迁移当前大盘
          </Button>,
        ]}
      >
        v6 版本将不再支持全局 Prometheus 集群切换，新版本可通过图表关联数据源变量来实现该能力。 <br />
        迁移工具会创建数据源变量以及关联所有未关联数据源的图表。
      </Modal>
      <MigrationModal
        visible={migrationModalOpen}
        setVisible={setMigrationModalOpen}
        boards={[dashboard]}
        onOk={() => {
          refresh();
        }}
      />
    </PageLayout>
  );
}
