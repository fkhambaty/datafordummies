import { Body, Notice, Row, Screen } from '../../components/ui';
import { tools } from '../../lib/catalog';
import { openSitePage } from '../../lib/navigation';

export default function Tools() {
  return (
    <Screen edges={['left', 'right']}>
      <Body muted>Interactive pages from datafordummies.in. They open inside the app and need a connection.</Body>
      {tools.map((tool) => (
        <Row
          key={tool.id}
          title={tool.title}
          subtitle={tool.summary}
          icon={tool.icon}
          onPress={() => openSitePage(tool.path, tool.title)}
          testID={`tool-${tool.id}`}
        />
      ))}
      <Notice tone="info">Excel and PDF exports from the tools are not available in the app. Use the website on a computer to export.</Notice>
    </Screen>
  );
}
