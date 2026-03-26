import { styled } from "@linaria/react";
import type { ReactNode } from "react";

const StyledVisual = styled.div`
  position: relative;
  width: 100%;
  overflow: hidden;
`;

export function Visual({ children }: { children: ReactNode }) {
  return <StyledVisual>{children}</StyledVisual>;
}
