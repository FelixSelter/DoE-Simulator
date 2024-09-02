import React from "react";

interface Props {
  title: string;
  textAlign?: "left" | "right";
}

export default function Index({ title, textAlign }: Props) {
  return (
    <div className="pb-2" style={{ textAlign }}>
      <h2>{title}:</h2>
    </div>
  );
}
