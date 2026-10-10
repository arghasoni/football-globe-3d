import { COUNTRY_POINTS } from './countryPoints.ts'
import type { CountryRef } from './types.ts'

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')

/** Names ESPN (and others) use that differ from world-atlas. Keys are normalised. */
const ALIASES: Record<string, string> = {
  unitedstates: '840',
  usa: '840',
  turkiye: '792',
  bosniaherzegovina: '070',
  bosniaandherzegovina: '070',
  congodr: '180',
  drcongo: '180',
  democraticrepublicofcongo: '180',
  faroeislands: '234',
  northmacedonia: '807',
  republicofireland: '372',
  czechrepublic: '203',
  korearepublic: '410',
  koreadpr: '408',
  ivorycoast: '384',
  capeverde: '132',
  capeverdeislands: '132',
  chinapr: '156',
  irirania: '364',
  chinesetaipei: '158',
  eswatini: '748',
  dominicanrepublic: '214',
  equatorialguinea: '226',
  southsudan: '728',
  centralafricanrepublic: '140',
  solomonislands: '090',
  stkittsandnevis: '659',
  antiguaandbarbuda: '028',
  uae: '784',
}

const BY_NAME = new Map<string, string>()
for (const [code, p] of Object.entries(COUNTRY_POINTS)) BY_NAME.set(normalise(p.name), code)
for (const [alias, code] of Object.entries(ALIASES)) BY_NAME.set(alias, code)

function ref(code: string | undefined): CountryRef | null {
  if (!code) return null
  const p = COUNTRY_POINTS[code]
  return p ? { code, name: p.name } : null
}

export function countryByName(name: string): CountryRef | null {
  return ref(BY_NAME.get(normalise(name)))
}

/** ESPN league slug prefix → country code. */
const LEAGUE_PREFIX: Record<string, string> = {
  eng: 'gb-eng', sco: 'gb-sct', wal: 'gb-wls', nir: 'gb-nir', irl: '372',
  esp: '724', fra: '250', ita: '380', ger: '276', ned: '528', por: '620', bel: '056',
  tur: '792', aut: '040', sui: '756', gre: '300', cze: '203', den: '208', nor: '578',
  swe: '752', fin: '246', isl: '352', pol: '616', cro: '191', srb: '688', ukr: '804',
  rus: '643', aze: '031', kaz: '398', cyp: '196', isr: '376', hun: '348', rou: '642',
  bul: '100', svk: '703', svn: '705', alb: '008', arm: '051', geo: '268', mda: '498',
  mlt: '470', lux: '442', bih: '070', mkd: '807', mne: '499', blr: '112', lva: '428',
  ltu: '440', est: '233', and: '020', smr: '674', gib: 'gi', fro: '234', kos: 'xk',
  ksa: '682', usa: '840', mex: '484', bra: '076', arg: '032', jpn: '392', kor: '410',
  chn: '156', aus: '036', ind: '356',
}

export function countryByLeagueSlug(slug: string): CountryRef | null {
  return ref(LEAGUE_PREFIX[slug.split('.')[0]])
}
