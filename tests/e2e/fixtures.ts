import type { CrocdbApiResponse, CrocdbEntryResponseData, CrocdbPlatformsResponseData, CrocdbRegionsResponseData, CrocdbSearchResponseData } from '@crocdesk/shared';

export function mockPlatforms(): CrocdbApiResponse<CrocdbPlatformsResponseData> {
  return {
    info: {},
    data: {
      platforms: {
        nes: { brand: 'Nintendo', name: 'NES' },
        snes: { brand: 'Nintendo', name: 'SNES' },
        ps2: { brand: 'Sony', name: 'PlayStation 2' },
      },
    },
  };
}

export function mockRegions(): CrocdbApiResponse<CrocdbRegionsResponseData> {
  return {
    info: {},
    data: {
      regions: {
        eu: 'Europe',
        us: 'North America',
        jp: 'Japan',
      },
    },
  } as any;
}

export function mockSearch(): CrocdbApiResponse<CrocdbSearchResponseData> {
  return {
    info: {},
    data: {
      results: [
        {
          slug: 'metroid-nes',
          title: 'Metroid',
          platform: 'nes',
          boxart_url: 'https://example.com/boxart/metroid.jpg',
          regions: ['eu'],
          links: [
            { name: 'Mirror 1', type: 'download', format: 'zip', url: 'https://mirror1/metroid.zip', filename: 'metroid.zip', host: 'mirror1', size: 1024 },
          ],
        },
        {
          slug: 'zelda-snes',
          title: 'A Link to the Past',
          platform: 'snes',
          regions: ['us'],
          links: [
            { name: 'Mirror 2', type: 'download', format: 'zip', url: 'https://mirror2/zelda.zip', filename: 'zelda.zip', host: 'mirror2', size: 2048 },
          ],
        },
      ],
      current_results: 2,
      total_results: 2,
      current_page: 1,
      total_pages: 1,
    },
  };
}

export function mockEntry(slug: string): CrocdbApiResponse<CrocdbEntryResponseData> {
  const base = {
    nes: {
      slug: 'metroid-nes',
      title: 'Metroid',
      platform: 'nes',
      boxart_url: 'https://example.com/boxart/metroid.jpg',
      regions: ['eu'] as string[],
      links: [
        { name: 'Mirror 1', type: 'download', format: 'zip', url: 'https://mirror1/metroid.zip', filename: 'metroid.zip', host: 'mirror1', size: 1024, size_str: '1KB' },
      ],
      screenshots: [
        'https://example.com/screens/metroid1.jpg',
        'https://example.com/screens/metroid2.jpg',
        'https://example.com/screens/metroid3.jpg',
      ].slice(),
    },
    snes: {
      slug: 'zelda-snes',
      title: 'A Link to the Past',
      platform: 'snes',
      regions: ['us'] as string[],
      links: [
        { name: 'Mirror 2', type: 'download', format: 'zip', url: 'https://mirror2/zelda.zip', filename: 'zelda.zip', host: 'mirror2', size: 2048, size_str: '2KB' },
      ],
      screenshots: [
        'https://example.com/screens/zelda1.jpg',
        'https://example.com/screens/zelda2.jpg',
        'https://example.com/screens/zelda3.jpg',
        'https://example.com/screens/zelda4.jpg',
        'https://example.com/screens/zelda5.jpg',
        'https://example.com/screens/zelda6.jpg',
        'https://example.com/screens/zelda7.jpg',
      ].slice(),
    },
  };

  const entry = slug.includes('metroid') ? base.nes : base.snes;
  return { info: {}, data: { entry } } as CrocdbApiResponse<CrocdbEntryResponseData>
}
