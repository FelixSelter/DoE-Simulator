import { z } from "zod";

//TODO: better type checking
const Color = z.string(); //CSSProperties["color"];

export const ThemeSchema = z.object({
  color1: Color,
  color2: Color,
  color3: Color,
  color4: Color,
});
export type Theme = z.infer<typeof ThemeSchema>;

export const darkTheme: Theme = {
  color1: "#2c2c2c",
  color2: "white",
  color3: "#1D1D1D",
  color4: "#454545",
};
