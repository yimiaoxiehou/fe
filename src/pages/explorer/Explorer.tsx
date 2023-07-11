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
/**
 * querystring
 * data_source_name: string
 * data_source_id: string
 */
import React, { useState, useRef, useContext } from 'react';
import { Button, Card, Space, Input, Form, Select } from 'antd';
import { PlusOutlined, CloseCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation, useHistory } from 'react-router-dom';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import EmptyDatasourcePopover from '@/components/DatasourceSelect/EmptyDatasourcePopover';
import { DatasourceCateEnum } from '@/utils/constant';
import { getDefaultDatasourceValue, setDefaultDatasourceValue } from '@/utils';
import { CommonStateContext } from '@/App';
import { DatasourceCateSelect } from '@/components/DatasourceSelect';
import Prometheus from './Prometheus';
// @ts-ignore
import PlusExplorer from 'plus:/parcels/Explorer';
import './index.less';

type PanelMeta = { id: string };
interface IPanelProps {
  id: string;
  removePanel: (id: string) => void;
  type: Type;
  defaultCate: string;
}
type Type = 'logging' | 'metric';

const Panel = ({ removePanel, id, type, defaultCate }: IPanelProps) => {
  const { t } = useTranslation('explorer');
  const { groupedDatasourceList } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const history = useHistory();
  const headerExtraRef = useRef<HTMLDivElement>(null);
  const params = new URLSearchParams(useLocation().search);
  const datasourceCate = params.get('data_source_name') || localStorage.getItem(`explorer_datasource_cate_${type}`) || defaultCate;
  const datasourceValue = params.get('data_source_id') ? _.toNumber(params.get('data_source_id')) : getDefaultDatasourceValue(datasourceCate, groupedDatasourceList);

  return (
    <Card bodyStyle={{ padding: 16 }} className='panel'>
      <Form
        form={form}
        initialValues={{
          datasourceCate: datasourceCate,
          datasourceValue: datasourceValue,
        }}
      >
        <Space align='start'>
          <InputGroupWithFormItem label={t('common:datasource.type')}>
            <Form.Item name='datasourceCate' noStyle>
              <DatasourceCateSelect
                scene='graph'
                filterCates={(cates) => {
                  return _.filter(cates, (item) => item.type === type);
                }}
                dropdownMatchSelectWidth={false}
                style={{ minWidth: 70 }}
                onChange={(val) => {
                  form.setFieldsValue({
                    datasourceValue: getDefaultDatasourceValue(val, groupedDatasourceList),
                  });
                  history.replace({
                    search: `?data_source_name=${val}&data_source_id=${getDefaultDatasourceValue(val, groupedDatasourceList)}`,
                  });
                }}
              />
            </Form.Item>
          </InputGroupWithFormItem>
          <Form.Item shouldUpdate={(prev, curr) => prev.datasourceCate !== curr.datasourceCate} noStyle>
            {({ getFieldValue }) => {
              const cate = getFieldValue('datasourceCate');
              return (
                <EmptyDatasourcePopover datasourceList={groupedDatasourceList[cate]}>
                  <Input.Group compact>
                    <span
                      className='ant-input-group-addon'
                      style={{
                        width: 'max-content',
                        height: 32,
                        lineHeight: '32px',
                      }}
                    >
                      {t('common:datasource.id')}
                    </span>

                    <Form.Item
                      name='datasourceValue'
                      rules={[
                        {
                          required: true,
                          message: t('common:datasource.id_required'),
                        },
                      ]}
                    >
                      <Select
                        style={{ minWidth: 70 }}
                        dropdownMatchSelectWidth={false}
                        onChange={(val: string) => {
                          setDefaultDatasourceValue(cate, val);
                          history.replace({
                            search: `?data_source_name=${cate}&data_source_id=${val}`,
                          });
                        }}
                        showSearch
                        optionFilterProp='children'
                      >
                        {_.map(groupedDatasourceList[cate], (item) => (
                          <Select.Option value={item.id} key={item.id}>
                            {item.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Input.Group>
                </EmptyDatasourcePopover>
              );
            }}
          </Form.Item>
          <div ref={headerExtraRef} />
        </Space>
        <Form.Item shouldUpdate noStyle>
          {({ getFieldValue }) => {
            const datasourceCate = getFieldValue('datasourceCate');
            const datasourceValue = getFieldValue('datasourceValue');
            if (datasourceCate === DatasourceCateEnum.prometheus) {
              return <Prometheus key={datasourceValue} headerExtra={headerExtraRef.current} datasourceValue={datasourceValue} form={form} />;
            }
            return <PlusExplorer datasourceCate={datasourceCate} datasourceValue={datasourceValue} headerExtraRef={headerExtraRef} form={form} />;
          }}
        </Form.Item>
      </Form>
      <span
        className='remove-panel-btn'
        onClick={() => {
          removePanel(id);
        }}
      >
        <CloseCircleOutlined />
      </span>
    </Card>
  );
};

interface IProps {
  type: Type;
  defaultCate: string;
}

const PanelList = ({ type, defaultCate }: IProps) => {
  const { t } = useTranslation('explorer');
  const [panelList, setPanelList] = useState<PanelMeta[]>([
    {
      id: _.uniqueId('panel_'),
    },
  ]);

  return (
    <>
      {panelList.map(({ id }) => {
        return (
          <Panel
            key={id}
            id={id}
            removePanel={() => {
              setPanelList(_.filter(panelList, (item) => item.id !== id));
            }}
            type={type}
            defaultCate={defaultCate}
          />
        );
      })}
      <div className='add-prometheus-panel'>
        <Button
          size='large'
          onClick={() => {
            setPanelList(() => [
              ...panelList,
              {
                id: _.uniqueId('panel_'),
              },
            ]);
          }}
        >
          <PlusOutlined />
          {t('add_btn')}
        </Button>
      </div>
    </>
  );
};

export default PanelList;
