const STATE_SUBSCRIPT = /^([a-zA-Z]+)(\d+)$/;

export default function StateName({ name }: { name: string }) {
  const match = STATE_SUBSCRIPT.exec(name);
  if (!match) return <>{name}</>;
  return (
    <>
      {match[1]}
      <sub>{match[2]}</sub>
    </>
  );
}
