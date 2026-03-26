import { CTA } from '@/design-system/components';
import { CtaType } from '@/design-system/components/CTA/types/Cta';
import { theme } from '@/theme';
import { styled } from '@linaria/react';

const CTAsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing(4)};
  justify-content: center;
`;

export type HeroCTAsProps = { cta: CtaType | CtaType[] };

export function CTAs({ cta }: HeroCTAsProps) {
  return (
    <CTAsContainer>
      <CTA cta={cta} />
    </CTAsContainer>
  );
}
