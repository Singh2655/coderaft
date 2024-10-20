export const Output = ({ replId, port }: { replId: string; port: number }) => {
  const URI = `http://${replId}.localhost?port=${port}`;
  return (
    <div style={{ height: "40vh", background: "white" }}>
      <iframe width={"100%"} height={"100%"} src={`${URI}`} />
    </div>
  );
};
