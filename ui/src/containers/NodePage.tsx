import { useSelector } from 'react-redux';
import { useTheme } from 'styled-components';
import { refreshNodesAction, stopRefreshNodesAction } from '../ducks/app/nodes';
import { useTypedSelector } from '../hooks';
import { getNodeListData } from '../services/NodeUtils';
import { useRefreshEffect } from '../services/utils';
import { useAlerts } from './AlertProvider';
import NodePageContent from './NodePageContent';

const NodePage = (props) => {
  useRefreshEffect(refreshNodesAction, stopRefreshNodesAction);
  const { alerts } = useAlerts();
  const theme = useTheme();
  const nodeTableData = useSelector(
    // @ts-expect-error - FIXME when you are working on it
    (state) => getNodeListData(alerts, theme)(state, props),
    (left, right) => {
      return JSON.stringify(left) === JSON.stringify(right);
    },
  );
  const nodesLoading = useTypedSelector((state) => state.app.nodes.isLoading);
  return (
    <>
      <NodePageContent nodeTableData={nodeTableData} loading={nodesLoading} />
    </>
  );
};

export default NodePage;
