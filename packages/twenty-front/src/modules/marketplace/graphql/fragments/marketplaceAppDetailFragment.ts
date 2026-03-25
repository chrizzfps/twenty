import gql from 'graphql-tag';

export const MARKETPLACE_APP_DETAIL_FRAGMENT = gql`
  fragment MarketplaceAppDetailFields on MarketplaceAppDetail {
    universalIdentifier
    name
    sourceType
    sourcePackage
    latestAvailableVersion
    isListed
    isFeatured
    manifest
  }
`;
