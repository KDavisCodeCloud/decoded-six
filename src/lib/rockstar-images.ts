export type RockstarImageCategory =
  | 'characters'
  | 'vice_city'
  | 'leonida_keys'
  | 'port_gellhorn'
  | 'grassrivers'
  | 'ambrosia'
  | 'mount_kalaga'
  | 'keyart'
  | 'ultimate_edition'
  | 'vintage_vice_city';

export interface RockstarImage {
  url: string;
  caption: string;
  category: RockstarImageCategory;
  tags: string[];
}

const BASE = 'https://www.rockstargames.com/VI/_next/static/media';

export const ROCKSTAR_IMAGES: RockstarImage[] = [
  // Characters
  { url: '/images/tier1/characters/jason-duval/screenshot-Jason_Duval_01.jpg', caption: 'Jason Duval', category: 'characters', tags: ['jason', 'jason duval', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/jason-duval/screenshot-Jason_Duval_02.jpg', caption: 'Jason Duval', category: 'characters', tags: ['jason', 'jason duval', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/jason-duval/screenshot-Jason_Duval_03.jpg', caption: 'Jason Duval', category: 'characters', tags: ['jason', 'jason duval', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/jason-duval/screenshot-Jason_Duval_04.jpg', caption: 'Jason Duval', category: 'characters', tags: ['jason', 'jason duval', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/jason-duval/screenshot-Jason_Duval_05.jpg', caption: 'Jason Duval', category: 'characters', tags: ['jason', 'jason duval', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/jason-duval/screenshot-Jason_Duval_06.jpg', caption: 'Jason Duval', category: 'characters', tags: ['jason', 'jason duval', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/lucia-caminos/screenshot-Lucia_Caminos_01.jpg', caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'lucia caminos', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/lucia-caminos/screenshot-Lucia_Caminos_02.jpg', caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'lucia caminos', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/lucia-caminos/screenshot-Lucia_Caminos_03.jpg', caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'lucia caminos', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/lucia-caminos/screenshot-Lucia_Caminos_04.jpg', caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'lucia caminos', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/lucia-caminos/screenshot-Lucia_Caminos_05.jpg', caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'lucia caminos', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/lucia-caminos/screenshot-Lucia_Caminos_06.jpg', caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'lucia caminos', 'character', 'protagonist'] },
  { url: '/images/tier1/characters/cal-hampton/screenshot-Cal_Hampton_01.jpg', caption: 'Cal Hampton', category: 'characters', tags: ['cal hampton', 'character', 'supporting'] },
  { url: '/images/tier1/characters/cal-hampton/screenshot-Cal_Hampton_02.jpg', caption: 'Cal Hampton', category: 'characters', tags: ['cal hampton', 'character', 'supporting'] },
  { url: '/images/tier1/characters/cal-hampton/screenshot-Cal_Hampton_03.jpg', caption: 'Cal Hampton', category: 'characters', tags: ['cal hampton', 'character', 'supporting'] },
  { url: '/images/tier1/characters/cal-hampton/screenshot-Cal_Hampton_04.jpg', caption: 'Cal Hampton', category: 'characters', tags: ['cal hampton', 'character', 'supporting'] },
  { url: '/images/tier1/characters/cal-hampton/artwork-Cal_Hampton_landscape.jpg', caption: 'Cal Hampton', category: 'characters', tags: ['cal hampton', 'character', 'supporting', 'artwork'] },
  { url: '/images/tier1/characters/boobie-ike/screenshot-Boobie_Ike_01.jpg', caption: 'Boobie Ike', category: 'characters', tags: ['boobie ike', 'character', 'supporting'] },
  { url: '/images/tier1/characters/boobie-ike/screenshot-Boobie_Ike_02.jpg', caption: 'Boobie Ike', category: 'characters', tags: ['boobie ike', 'character', 'supporting'] },
  { url: '/images/tier1/characters/boobie-ike/screenshot-Boobie_Ike_03.jpg', caption: 'Boobie Ike', category: 'characters', tags: ['boobie ike', 'character', 'supporting'] },
  { url: '/images/tier1/characters/boobie-ike/screenshot-Boobie_Ike_04.jpg', caption: 'Boobie Ike', category: 'characters', tags: ['boobie ike', 'character', 'supporting'] },
  { url: '/images/tier1/characters/boobie-ike/artwork-Boobie_Ike_landscape.jpg', caption: 'Boobie Ike', category: 'characters', tags: ['boobie ike', 'character', 'supporting', 'artwork'] },
  { url: '/images/tier1/characters/drequan-priest/screenshot-DreQuan_Priest_01.jpg', caption: "Dre'Quan Priest", category: 'characters', tags: ['drequan', "dre'quan priest", 'character', 'supporting'] },
  { url: '/images/tier1/characters/drequan-priest/screenshot-DreQuan_Priest_02.jpg', caption: "Dre'Quan Priest", category: 'characters', tags: ['drequan', "dre'quan priest", 'character', 'supporting'] },
  { url: '/images/tier1/characters/drequan-priest/screenshot-DreQuan_Priest_03.jpg', caption: "Dre'Quan Priest", category: 'characters', tags: ['drequan', "dre'quan priest", 'character', 'supporting'] },
  { url: '/images/tier1/characters/drequan-priest/screenshot-DreQuan_Priest_04.jpg', caption: "Dre'Quan Priest", category: 'characters', tags: ['drequan', "dre'quan priest", 'character', 'supporting'] },
  { url: '/images/tier1/characters/drequan-priest/artwork-DreQuan_Priest_landscape.jpg', caption: "Dre'Quan Priest", category: 'characters', tags: ['drequan', "dre'quan priest", 'character', 'supporting', 'artwork'] },
  { url: '/images/tier1/characters/real-dimez/screenshot-Real_Dimez_01.jpg', caption: 'Real Dimez', category: 'characters', tags: ['real dimez', 'character', 'supporting'] },
  { url: '/images/tier1/characters/real-dimez/screenshot-Real_Dimez_02.jpg', caption: 'Real Dimez', category: 'characters', tags: ['real dimez', 'character', 'supporting'] },
  { url: '/images/tier1/characters/real-dimez/screenshot-Real_Dimez_03.jpg', caption: 'Real Dimez', category: 'characters', tags: ['real dimez', 'character', 'supporting'] },
  { url: '/images/tier1/characters/real-dimez/screenshot-Real_Dimez_04.jpg', caption: 'Real Dimez', category: 'characters', tags: ['real dimez', 'character', 'supporting'] },
  { url: '/images/tier1/characters/real-dimez/artwork-Real_Dimez_landscape.jpg', caption: 'Real Dimez', category: 'characters', tags: ['real dimez', 'character', 'supporting', 'artwork'] },
  { url: '/images/tier1/characters/raul-bautista/screenshot-Raul_Bautista_01.jpg', caption: 'Raul Bautista', category: 'characters', tags: ['raul bautista', 'character', 'supporting'] },
  { url: '/images/tier1/characters/raul-bautista/screenshot-Raul_Bautista_02.jpg', caption: 'Raul Bautista', category: 'characters', tags: ['raul bautista', 'character', 'supporting'] },
  { url: '/images/tier1/characters/raul-bautista/screenshot-Raul_Bautista_03.jpg', caption: 'Raul Bautista', category: 'characters', tags: ['raul bautista', 'character', 'supporting'] },
  { url: '/images/tier1/characters/raul-bautista/screenshot-Raul_Bautista_04.jpg', caption: 'Raul Bautista', category: 'characters', tags: ['raul bautista', 'character', 'supporting'] },
  { url: '/images/tier1/characters/raul-bautista/artwork-Raul_Bautista_landscape.jpg', caption: 'Raul Bautista', category: 'characters', tags: ['raul bautista', 'character', 'supporting', 'artwork'] },
  { url: '/images/tier1/characters/brian-heder/screenshot-Brian_Heder_01.jpg', caption: 'Brian Heder', category: 'characters', tags: ['brian heder', 'character', 'supporting'] },
  { url: '/images/tier1/characters/brian-heder/screenshot-Brian_Heder_02.jpg', caption: 'Brian Heder', category: 'characters', tags: ['brian heder', 'character', 'supporting'] },
  { url: '/images/tier1/characters/brian-heder/screenshot-Brian_Heder_03.jpg', caption: 'Brian Heder', category: 'characters', tags: ['brian heder', 'character', 'supporting'] },
  { url: '/images/tier1/characters/brian-heder/screenshot-Brian_Heder_04.jpg', caption: 'Brian Heder', category: 'characters', tags: ['brian heder', 'character', 'supporting'] },
  { url: '/images/tier1/characters/brian-heder/artwork-Brian_Heder_landscape.jpg', caption: 'Brian Heder', category: 'characters', tags: ['brian heder', 'character', 'supporting', 'artwork'] },
  // Vice City
  { url: '/images/tier1/locations/vice-city/screenshot-Vice_City_01.jpg', caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location', 'zone', 'downtown', 'beach'] },
  { url: '/images/tier1/locations/vice-city/screenshot-Vice_City_02.jpg', caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location', 'zone', 'downtown', 'beach'] },
  { url: '/images/tier1/locations/vice-city/screenshot-Vice_City_03.jpg', caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location', 'zone', 'downtown', 'beach'] },
  { url: '/images/tier1/locations/vice-city/screenshot-Vice_City_04.jpg', caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location', 'zone', 'downtown', 'beach'] },
  { url: '/images/tier1/locations/vice-city/screenshot-Vice_City_05.jpg', caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location', 'zone', 'downtown', 'beach'] },
  { url: '/images/tier1/locations/vice-city/screenshot-Vice_City_06.jpg', caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location', 'zone', 'downtown', 'beach'] },
  { url: '/images/tier1/locations/vice-city/screenshot-Vice_City_07.jpg', caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location', 'zone', 'downtown', 'beach'] },
  { url: '/images/tier1/locations/vice-city/screenshot-Vice_City_08.jpg', caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location', 'zone', 'downtown', 'beach'] },
  { url: '/images/tier1/locations/vice-city/screenshot-Vice_City_09.jpg', caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location', 'zone', 'downtown', 'beach'] },
  { url: '/images/tier1/locations/vice-city/postcard-Vice_City_Postcard_landscape.jpg', caption: 'Vice City Postcard', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location', 'zone', 'downtown', 'beach', 'postcard', 'artwork'] },
  // Leonida Keys
  { url: '/images/tier1/locations/leonida-keys/screenshot-Leonida_Keys_01.jpg', caption: 'Leonida Keys', category: 'leonida_keys', tags: ['leonida keys', 'islands', 'keys', 'water', 'map', 'location'] },
  { url: '/images/tier1/locations/leonida-keys/screenshot-Leonida_Keys_02.jpg', caption: 'Leonida Keys', category: 'leonida_keys', tags: ['leonida keys', 'islands', 'keys', 'water', 'map', 'location'] },
  { url: '/images/tier1/locations/leonida-keys/screenshot-Leonida_Keys_03.jpg', caption: 'Leonida Keys', category: 'leonida_keys', tags: ['leonida keys', 'islands', 'keys', 'water', 'map', 'location'] },
  { url: '/images/tier1/locations/leonida-keys/screenshot-Leonida_Keys_04.jpg', caption: 'Leonida Keys', category: 'leonida_keys', tags: ['leonida keys', 'islands', 'keys', 'water', 'map', 'location'] },
  { url: '/images/tier1/locations/leonida-keys/screenshot-Leonida_Keys_05.jpg', caption: 'Leonida Keys', category: 'leonida_keys', tags: ['leonida keys', 'islands', 'keys', 'water', 'map', 'location'] },
  { url: '/images/tier1/locations/leonida-keys/postcard-Leonida_Keys_Postcard_landscape.jpg', caption: 'Leonida Keys Postcard', category: 'leonida_keys', tags: ['leonida keys', 'islands', 'keys', 'water', 'map', 'location', 'postcard', 'artwork'] },
  // Port Gellhorn
  { url: '/images/tier1/locations/port-gellhorn/screenshot-Port_Gellhorn_01.jpg', caption: 'Port Gellhorn', category: 'port_gellhorn', tags: ['port gellhorn', 'port', 'industrial', 'heist', 'map', 'location'] },
  { url: '/images/tier1/locations/port-gellhorn/screenshot-Port_Gellhorn_02.jpg', caption: 'Port Gellhorn', category: 'port_gellhorn', tags: ['port gellhorn', 'port', 'industrial', 'heist', 'map', 'location'] },
  { url: '/images/tier1/locations/port-gellhorn/screenshot-Port_Gellhorn_03.jpg', caption: 'Port Gellhorn', category: 'port_gellhorn', tags: ['port gellhorn', 'port', 'industrial', 'heist', 'map', 'location'] },
  { url: '/images/tier1/locations/port-gellhorn/screenshot-Port_Gellhorn_04.jpg', caption: 'Port Gellhorn', category: 'port_gellhorn', tags: ['port gellhorn', 'port', 'industrial', 'heist', 'map', 'location'] },
  { url: '/images/tier1/locations/port-gellhorn/screenshot-Port_Gellhorn_05.jpg', caption: 'Port Gellhorn', category: 'port_gellhorn', tags: ['port gellhorn', 'port', 'industrial', 'heist', 'map', 'location'] },
  { url: '/images/tier1/locations/port-gellhorn/postcard-Port_Gellhorn_Postcard_landscape.jpg', caption: 'Port Gellhorn Postcard', category: 'port_gellhorn', tags: ['port gellhorn', 'port', 'industrial', 'heist', 'map', 'location', 'postcard', 'artwork'] },
  // Grassrivers
  { url: '/images/tier1/locations/grassrivers/screenshot-Grassrivers_01.jpg', caption: 'Grassrivers', category: 'grassrivers', tags: ['grassrivers', 'swamp', 'rural', 'map', 'location'] },
  { url: '/images/tier1/locations/grassrivers/screenshot-Grassrivers_02.jpg', caption: 'Grassrivers', category: 'grassrivers', tags: ['grassrivers', 'swamp', 'rural', 'map', 'location'] },
  { url: '/images/tier1/locations/grassrivers/screenshot-Grassrivers_03.jpg', caption: 'Grassrivers', category: 'grassrivers', tags: ['grassrivers', 'swamp', 'rural', 'map', 'location'] },
  { url: '/images/tier1/locations/grassrivers/screenshot-Grassrivers_04.jpg', caption: 'Grassrivers', category: 'grassrivers', tags: ['grassrivers', 'swamp', 'rural', 'map', 'location'] },
  { url: '/images/tier1/locations/grassrivers/postcard-Grassrivers_Postcard_landscape.jpg', caption: 'Grassrivers Postcard', category: 'grassrivers', tags: ['grassrivers', 'swamp', 'rural', 'map', 'location', 'postcard', 'artwork'] },
  // Ambrosia
  { url: '/images/tier1/locations/ambrosia/screenshot-Ambrosia_01.jpg', caption: 'Ambrosia', category: 'ambrosia', tags: ['ambrosia', 'map', 'location'] },
  { url: '/images/tier1/locations/ambrosia/screenshot-Ambrosia_02.jpg', caption: 'Ambrosia', category: 'ambrosia', tags: ['ambrosia', 'map', 'location'] },
  { url: '/images/tier1/locations/ambrosia/screenshot-Ambrosia_03.jpg', caption: 'Ambrosia', category: 'ambrosia', tags: ['ambrosia', 'map', 'location'] },
  { url: '/images/tier1/locations/ambrosia/screenshot-Ambrosia_04.jpg', caption: 'Ambrosia', category: 'ambrosia', tags: ['ambrosia', 'map', 'location'] },
  { url: '/images/tier1/locations/ambrosia/screenshot-Ambrosia_05.jpg', caption: 'Ambrosia', category: 'ambrosia', tags: ['ambrosia', 'map', 'location'] },
  { url: '/images/tier1/locations/ambrosia/postcard-Ambrosia_Postcard_landscape.jpg', caption: 'Ambrosia Postcard', category: 'ambrosia', tags: ['ambrosia', 'map', 'location', 'postcard', 'artwork'] },
  // Mount Kalaga
  { url: '/images/tier1/locations/mount-kalaga/screenshot-Mount_Kalaga_National_Park_01.jpg', caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'kalaga', 'national park', 'mountain', 'wilderness', 'map', 'location'] },
  { url: '/images/tier1/locations/mount-kalaga/screenshot-Mount_Kalaga_National_Park_02.jpg', caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'kalaga', 'national park', 'mountain', 'wilderness', 'map', 'location'] },
  { url: '/images/tier1/locations/mount-kalaga/screenshot-Mount_Kalaga_National_Park_03.jpg', caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'kalaga', 'national park', 'mountain', 'wilderness', 'map', 'location'] },
  { url: '/images/tier1/locations/mount-kalaga/screenshot-Mount_Kalaga_National_Park_04.jpg', caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'kalaga', 'national park', 'mountain', 'wilderness', 'map', 'location'] },
  { url: '/images/tier1/locations/mount-kalaga/screenshot-Mount_Kalaga_National_Park_05.jpg', caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'kalaga', 'national park', 'mountain', 'wilderness', 'map', 'location'] },
  { url: '/images/tier1/locations/mount-kalaga/screenshot-Mount_Kalaga_National_Park_06.jpg', caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'kalaga', 'national park', 'mountain', 'wilderness', 'map', 'location'] },
  { url: '/images/tier1/locations/mount-kalaga/postcard-Mount_Kalaga_National_Park_Postcard_landscape.jpg', caption: 'Mount Kalaga National Park Postcard', category: 'mount_kalaga', tags: ['mount kalaga', 'kalaga', 'national park', 'mountain', 'wilderness', 'map', 'location', 'postcard', 'artwork'] },
  // Key Art
  { url: '/images/tier1/keyart/jason-lucia-01/Jason_and_Lucia_01_landscape.jpg', caption: 'Jason and Lucia', category: 'keyart', tags: ['jason', 'lucia', 'artwork', 'protagonists', 'duo', 'key art'] },
  { url: '/images/tier1/keyart/jason-lucia-01-with-logos/Jason_and_Lucia_01_With_Logos_landscape.jpg', caption: 'Jason and Lucia (with logos)', category: 'keyart', tags: ['jason', 'lucia', 'artwork', 'protagonists', 'duo', 'key art', 'logo'] },
  { url: '/images/tier1/keyart/jason-lucia-02/Jason_and_Lucia_02_landscape.jpg', caption: 'Jason and Lucia', category: 'keyart', tags: ['jason', 'lucia', 'artwork', 'protagonists', 'duo', 'key art'] },
  { url: '/images/tier1/keyart/jason-lucia-02-with-logos/Jason_and_Lucia_02_With_Logos_landscape.jpg', caption: 'Jason and Lucia (with logos)', category: 'keyart', tags: ['jason', 'lucia', 'artwork', 'protagonists', 'duo', 'key art', 'logo'] },
  { url: '/images/tier1/keyart/jason-lucia-03/Jason_and_Lucia_03_landscape.jpg', caption: 'Jason and Lucia', category: 'keyart', tags: ['jason', 'lucia', 'artwork', 'protagonists', 'duo', 'key art'] },
  { url: '/images/tier1/keyart/jason-lucia-03-with-logos/Jason_and_Lucia_03_With_Logos_landscape.jpg', caption: 'Jason and Lucia (with logos)', category: 'keyart', tags: ['jason', 'lucia', 'artwork', 'protagonists', 'duo', 'key art', 'logo'] },
  { url: '/images/tier1/keyart/jason-lucia-motel/Jason_and_Lucia_Motel_landscape.jpg', caption: 'Jason and Lucia — Motel', category: 'keyart', tags: ['jason', 'lucia', 'motel', 'scene', 'artwork', 'key art', 'story'] },
  { url: '/images/tier1/keyart/official-cover-art/Official_Cover_Art_landscape.jpg', caption: 'GTA VI Official Cover Art', category: 'keyart', tags: ['cover art', 'official', 'artwork', 'jason', 'lucia', 'gta 6', 'release', 'key art'] },
  // Ultimate Edition
  { url: `${BASE}/ULTIMATE_EDITION_01.16qc1xq5nigg1.jpg`, caption: 'GTA 6 Ultimate Edition', category: 'ultimate_edition', tags: ['ultimate edition', 'pre-order', 'dlc'] },
  { url: `${BASE}/ULTIMATE_EDITION_02.0q-6.nrtf~jj0.jpg`, caption: 'GTA 6 Ultimate Edition', category: 'ultimate_edition', tags: ['ultimate edition', 'pre-order', 'dlc'] },
  { url: `${BASE}/ULTIMATE_EDITION_GROTTI_CHEETAH_01.0a.wy3s_ogjey.jpg`, caption: "'95 Grotti Cheetah", category: 'ultimate_edition', tags: ['grotti cheetah', 'vehicle', 'car', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_GROTTI_CHEETAH_02.0rkrlsu_dg~ww.jpg`, caption: "'95 Grotti Cheetah", category: 'ultimate_edition', tags: ['grotti cheetah', 'vehicle', 'car', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_HAWK_AND_LITTLE_MORGAN_REVOLVERS_01.0~3pdc~~sing4.jpg`, caption: 'Hawk & Little Morgan Revolvers', category: 'ultimate_edition', tags: ['revolver', 'weapon', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_HAWK_AND_LITTLE_MORGAN_REVOLVERS_02.04e_9jco7lluf.jpg`, caption: 'Hawk & Little Morgan Revolvers', category: 'ultimate_edition', tags: ['revolver', 'weapon', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_WEAPON_VARIANTS_01.12licq0_o7mb5.jpg`, caption: 'Personalized Weapon Variants', category: 'ultimate_edition', tags: ['weapon', 'pistol', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_VICE_CITY_STYLE_01.0.u1gt~99yzks.jpg`, caption: 'Vice City Style', category: 'ultimate_edition', tags: ['outfit', 'style', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_VICE_CITY_STYLE_02.0c-r4s-x7srt5.jpg`, caption: 'Vice City Style', category: 'ultimate_edition', tags: ['outfit', 'style', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_VAPID_GANADO_RETRO_BUILD_01.062dgvkwdynw5.jpg`, caption: 'Ganado Retro Build', category: 'ultimate_edition', tags: ['ganado', 'truck', 'vehicle', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_SQUALO_01.0cim7hj58ypb1.jpg`, caption: 'Shitzu Squalo Watercraft', category: 'ultimate_edition', tags: ['squalo', 'boat', 'watercraft', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_VAPID_BUGGY_01.0jxfiql~371ik.jpg`, caption: "'67 Vapid Dominator Buggy", category: 'ultimate_edition', tags: ['buggy', 'off-road', 'vehicle', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_VAPID_BUGGY_02.0tf15jp~61bkj.jpg`, caption: "'67 Vapid Dominator Buggy", category: 'ultimate_edition', tags: ['buggy', 'off-road', 'vehicle', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_ELECTRIC_FANG_01.04tsytu7qp2b-.jpg`, caption: 'Electric Fang Tattoo Shop', category: 'ultimate_edition', tags: ['tattoo', 'electric fang', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_WYMAN_CAR_COLLECTION_01.0swhrm__iu~6b.jpg`, caption: 'Classic Car Collection', category: 'ultimate_edition', tags: ['classic cars', 'vehicles', 'ultimate edition', 'wyman'] },
  { url: `${BASE}/ULTIMATE_EDITION_WYMAN_CAR_COLLECTION_02.0_biiqjqkpg2b.jpg`, caption: 'Classic Car Collection', category: 'ultimate_edition', tags: ['classic cars', 'vehicles', 'ultimate edition', 'wyman'] },
  { url: `${BASE}/ULTIMATE_EDITION_RIDEOUT_CUSTOMS_01.065-ms8~k8vbq.jpg`, caption: 'Rideout Customs Mod Shop', category: 'ultimate_edition', tags: ['rideout customs', 'mod shop', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_SARAS_SALON_01.0gn7dwlvcgz17.jpg`, caption: "Sara's Unisex Salon", category: 'ultimate_edition', tags: ["sara's salon", 'hair', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_STOCK_305_01.0vuq0m5_1j-17.jpg`, caption: 'Stock 305 Clothing Store', category: 'ultimate_edition', tags: ['stock 305', 'clothing', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_GOODTIME_GEAR_01.0t7de8dow381q.jpg`, caption: 'Goodtime Gear', category: 'ultimate_edition', tags: ['goodtime gear', 'apparel', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_PTT_STORE_01.0seuocb~7b1-q.jpg`, caption: 'PTT YOUNGIN$ Compound', category: 'ultimate_edition', tags: ['ptt', 'gang', 'ultimate edition'] },
  { url: `${BASE}/ULTIMATE_EDITION_ONE_EYED_WILLIE_01.0n7-__or5f.b6.jpg`, caption: "One-Eyed Willie's Mod Shop", category: 'ultimate_edition', tags: ['one-eyed willie', 'mod shop', 'off-road', 'ultimate edition'] },
  // Vintage Vice City Pack
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_01.05zaof7o1uz.3.jpg`, caption: 'Vintage Vice City Pack', category: 'vintage_vice_city', tags: ['vintage vice city', 'pre-order', 'pack'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_02.14mvx9a15z8jv.jpg`, caption: 'Vintage Vice City Pack', category: 'vintage_vice_city', tags: ['vintage vice city', 'pre-order', 'pack'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_VAPID_STANIER_01.004m_8d1~qngy.jpg`, caption: "'55 Vapid Stanier", category: 'vintage_vice_city', tags: ['vapid stanier', 'car', 'vehicle', 'vintage vice city'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_VAPID_STANIER_02.0s2wun4_vzld2.jpg`, caption: "'55 Vapid Stanier", category: 'vintage_vice_city', tags: ['vapid stanier', 'car', 'vehicle', 'vintage vice city'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_01.15zo0h-xdm91b.jpg`, caption: 'Vintage Vice City Outfits & Hairstyles', category: 'vintage_vice_city', tags: ['outfit', 'hairstyle', 'style', 'vintage vice city'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_02.12udfnroe-lah.jpg`, caption: 'Vintage Vice City Outfits & Hairstyles', category: 'vintage_vice_city', tags: ['outfit', 'hairstyle', 'style', 'vintage vice city'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_03.0au1tphsftqm5.jpg`, caption: 'Vintage Vice City Outfits & Hairstyles', category: 'vintage_vice_city', tags: ['outfit', 'hairstyle', 'style', 'vintage vice city'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_WEAPON_PATTERN_01.0gybtumgwdcoi.jpg`, caption: 'Vintage Vice City Weapon Pattern', category: 'vintage_vice_city', tags: ['weapon', 'pattern', 'vintage vice city'] },
];

export function getImagesByTags(keywords: string[], limit = 3): RockstarImage[] {
  const lower = keywords.map(k => k.toLowerCase());
  const scored = ROCKSTAR_IMAGES.map(img => ({
    img,
    score: img.tags.filter(t => lower.some(k => t.includes(k) || k.includes(t))).length,
  }));
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.img);
}

export function getImagesByCategory(category: RockstarImageCategory, limit = 3): RockstarImage[] {
  return ROCKSTAR_IMAGES.filter(img => img.category === category).slice(0, limit);
}
