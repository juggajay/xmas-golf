"use client";

export function Snow() {
  // Create 20 snowflakes
  const snowflakes = Array.from({ length: 20 }, (_, i) => (
    <div key={i} className="snowflake">
      ❄
    </div>
  ));

  return <div className="snow-container">{snowflakes}</div>;
}
