import React, { useState } from 'react';
import { Space, Form, Radio } from 'antd';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import PlusQueryBuilder from 'plus:/parcels/Dashboard/QueryBuilder';
import OrganizeFields from '../TransformationsEditor/OrganizeFields';
import DatasourceSelect from './components/DatasourceSelect';
import Prometheus from './Prometheus';

export default function index({ chartForm, type, variableConfig, dashboardId }) {
  const { t } = useTranslation('dashboard');
  const [mode, setMode] = useState('query');

  return (
    <div>
      <Space align='start'>
        {type === 'table' && (
          <Radio.Group
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
            }}
            buttonStyle='solid'
          >
            <Radio.Button value='query'>{t('query.title')}</Radio.Button>
            <Radio.Button value='transform'>{t('query.transform')} (beta)</Radio.Button>
          </Radio.Group>
        )}
        <DatasourceSelect chartForm={chartForm} variableConfig={variableConfig} />
      </Space>
      <div
        style={{
          display: mode === 'query' ? 'block' : 'none',
        }}
      >
        <Form.Item shouldUpdate={(prev, curr) => prev.datasourceCate !== curr.datasourceCate} noStyle>
          {({ getFieldValue }) => {
            const cate = getFieldValue('datasourceCate') || 'prometheus';
            if (cate === 'prometheus') {
              return <Prometheus chartForm={chartForm} variableConfig={variableConfig} dashboardId={dashboardId} />;
            }
            return <PlusQueryBuilder cate={cate} form={chartForm} variableConfig={variableConfig} dashboardId={dashboardId} />;
          }}
        </Form.Item>
      </div>
      <div
        style={{
          display: mode === 'transform' ? 'block' : 'none',
        }}
      >
        <OrganizeFields chartForm={chartForm} />
      </div>
    </div>
  );
}
