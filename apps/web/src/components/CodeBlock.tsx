type Props = {
  children: string;
};

export function CodeBlock({ children }: Props) {
  return (
    <pre>
      <code>{children.trim()}</code>
    </pre>
  );
}
