// Russian and Kazakh words people type, mapped to the stored district and service codes.
const DISTRICT_WORDS = {
  Almaly: ['алмалин', 'алмалы'], Auezov: ['ауэзов', 'әуезов'], Bostandyk: ['бостандык', 'бостандық'],
  Zhetysu: ['жетысу', 'жетісу'], Medeu: ['медеу'], Nauryzbay: ['наурызбай'], Turksib: ['турксиб', 'түрксіб'], Alatau: ['алатау'],
};
const SERVICE_WORDS = {
  walking: ['прогул', 'выгул', 'серуен', 'walk'], daycare: ['присмотр', 'дневн', 'daycare'], boarding: ['передерж', 'board'],
  grooming: ['грум', 'стриж', 'groom'], home_visit: ['визит', 'на дом', 'visit'], medication_care: ['лекарств', 'укол', 'дәрі', 'medic'],
};

const matchDistricts = (text) => Object.entries(DISTRICT_WORDS)
  .filter(([, words]) => words.some((w) => text.includes(w))).map(([key]) => key);
const matchServices = (text) => Object.entries(SERVICE_WORDS)
  .filter(([, words]) => words.some((w) => text.includes(w))).map(([key]) => key);

module.exports = { matchDistricts, matchServices };
