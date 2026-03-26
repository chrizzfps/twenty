import { BodyType } from '@/design-system/components/Body/types/Body';
import { CtaType } from '@/design-system/components/CTA/types/Cta';
import { HeadingType } from '@/design-system/components/Heading/types/Heading';

export type HeroDataType = {
  heading: HeadingType[];
  body: BodyType;
  ctas: CtaType[];
};
