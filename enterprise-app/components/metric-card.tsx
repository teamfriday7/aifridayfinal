import { Card, CardHeader, Text, Title3 } from "@fluentui/react-components";

export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <Card appearance="filled" style={{ minHeight: 112 }}>
      <CardHeader header={<Text size={200}>{label}</Text>} description={<Title3>{value}</Title3>} />
      <Text size={200}>{detail}</Text>
    </Card>
  );
}
