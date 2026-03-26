import { RectangleFillIcon } from "@/icons";
import { theme } from "@/theme";
import { styled } from "@linaria/react";

const EyebrowRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${theme.spacing(2)};
`;

const EyebrowText = styled.p`
  color: ${theme.colors.primary.text[60]};
  font-size: 1.125rem;
  font-weight: ${theme.font.weight.medium};
  line-height: 1.333;
  margin: 0;

  &[data-color-scheme="secondary"] {
    color: ${theme.colors.secondary.text[60]};
  }

  @media (min-width: ${theme.breakpoints.md}px) {
    font-size: 1.375rem;
    line-height: 1.273;
  }
`;

type EyebrowProps = {
  text: string;
  colorScheme: "primary" | "secondary";
}

export function Eyebrow({ text, colorScheme }: EyebrowProps) {
  return (
    <EyebrowRow>
      <RectangleFillIcon size={14} fillColor={theme.colors.highlight[100]} />
      <EyebrowText data-color-scheme={colorScheme}>{text}</EyebrowText>
    </EyebrowRow>
  );
}
