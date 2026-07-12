export type RockstarImageCategory =
  | 'characters'
  | 'vice_city'
  | 'leonida_keys'
  | 'port_gellhorn'
  | 'grassrivers'
  | 'ambrosia'
  | 'mount_kalaga'
  | 'ultimate_edition'
  | 'vintage_vice_city'
  | 'artwork';

export interface RockstarImage {
  url: string;
  caption: string;
  category: RockstarImageCategory;
  tags: string[];
}

const BASE = 'https://www.rockstargames.com/VI/_next/static/media';

export const ROCKSTAR_IMAGES: RockstarImage[] = [
  // Characters — Jason
  { url: `${BASE}/Jason_Duval_01.07m377xeb6jhq.jpg`, caption: 'Jason Duval', category: 'characters', tags: ['jason', 'character', 'protagonist'] },
  { url: `${BASE}/Jason_Duval_02.1486~7_v40cn..jpg`, caption: 'Jason Duval', category: 'characters', tags: ['jason', 'character', 'protagonist'] },
  { url: `${BASE}/Jason_Duval_03.0-1vum7x-3vtp.jpg`, caption: 'Jason Duval', category: 'characters', tags: ['jason', 'character', 'protagonist'] },
  { url: `${BASE}/Jason_Duval_04.16d-z2wa2s~bk.jpg`, caption: 'Jason Duval', category: 'characters', tags: ['jason', 'character', 'protagonist'] },
  { url: `${BASE}/Jason_Duval_05.0kxp6enhvzqka.jpg`, caption: 'Jason Duval', category: 'characters', tags: ['jason', 'character', 'protagonist'] },
  { url: `${BASE}/Jason_Duval_06.086o72llg6~1p.jpg`, caption: 'Jason Duval', category: 'characters', tags: ['jason', 'character', 'protagonist'] },
  // Characters — Lucia
  { url: `${BASE}/Lucia_Caminos_01.0a7yqvewctkfp.jpg`, caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'character', 'protagonist'] },
  { url: `${BASE}/Lucia_Caminos_02.16n.5umvlu_48.jpg`, caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'character', 'protagonist'] },
  { url: `${BASE}/Lucia_Caminos_03.14xgd2y_ymmeg.jpg`, caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'character', 'protagonist'] },
  { url: `${BASE}/Lucia_Caminos_04.04kb_~4ubn3wn.jpg`, caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'character', 'protagonist'] },
  { url: `${BASE}/Lucia_Caminos_05.0i5b7k6a7_w6p.jpg`, caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'character', 'protagonist'] },
  { url: `${BASE}/Lucia_Caminos_06.0fxbjfk0jakb3.jpg`, caption: 'Lucia Caminos', category: 'characters', tags: ['lucia', 'character', 'protagonist'] },
  // Characters — Supporting
  { url: `${BASE}/Cal_Hampton_01.0xlil231_osh4.jpg`, caption: 'Cal Hampton', category: 'characters', tags: ['cal hampton', 'character', 'supporting'] },
  { url: `${BASE}/Cal_Hampton_02.05r2t_mck65fe.jpg`, caption: 'Cal Hampton', category: 'characters', tags: ['cal hampton', 'character', 'supporting'] },
  { url: `${BASE}/Cal_Hampton_03.0.q68~pt1to9z.jpg`, caption: 'Cal Hampton', category: 'characters', tags: ['cal hampton', 'character', 'supporting'] },
  { url: `${BASE}/Cal_Hampton_04.0-78dep86yx2q.jpg`, caption: 'Cal Hampton', category: 'characters', tags: ['cal hampton', 'character', 'supporting'] },
  { url: `${BASE}/Boobie_Ike_01.0-wji2pg5anfs.jpg`, caption: 'Boobie Ike', category: 'characters', tags: ['boobie ike', 'character', 'supporting'] },
  { url: `${BASE}/Boobie_Ike_02.0sp9mtc.1cdzs.jpg`, caption: 'Boobie Ike', category: 'characters', tags: ['boobie ike', 'character', 'supporting'] },
  { url: `${BASE}/Boobie_Ike_03.0neka36~z25b5.jpg`, caption: 'Boobie Ike', category: 'characters', tags: ['boobie ike', 'character', 'supporting'] },
  { url: `${BASE}/Boobie_Ike_04.0~1fr6ijgvnzx.jpg`, caption: 'Boobie Ike', category: 'characters', tags: ['boobie ike', 'character', 'supporting'] },
  { url: `${BASE}/DreQuan_Priest_01.0_0~wi-ipdj35.jpg`, caption: "Dre'Quan Priest", category: 'characters', tags: ['drequan', 'character', 'supporting'] },
  { url: `${BASE}/DreQuan_Priest_02.02u69e~nkk3eo.jpg`, caption: "Dre'Quan Priest", category: 'characters', tags: ['drequan', 'character', 'supporting'] },
  { url: `${BASE}/DreQuan_Priest_03.0zbl4i_x_1biu.jpg`, caption: "Dre'Quan Priest", category: 'characters', tags: ['drequan', 'character', 'supporting'] },
  { url: `${BASE}/DreQuan_Priest_04.0n~kj~px_fn8t.jpg`, caption: "Dre'Quan Priest", category: 'characters', tags: ['drequan', 'character', 'supporting'] },
  { url: `${BASE}/Real_Dimez_01.0djwwboo8-glx.jpg`, caption: 'Real Dimez', category: 'characters', tags: ['real dimez', 'character', 'supporting'] },
  { url: `${BASE}/Real_Dimez_02.1366u9.x.yp0_.jpg`, caption: 'Real Dimez', category: 'characters', tags: ['real dimez', 'character', 'supporting'] },
  { url: `${BASE}/Real_Dimez_03.02o2si7.op.ye.jpg`, caption: 'Real Dimez', category: 'characters', tags: ['real dimez', 'character', 'supporting'] },
  { url: `${BASE}/Real_Dimez_04.0wa3vo07lz4e2.jpg`, caption: 'Real Dimez', category: 'characters', tags: ['real dimez', 'character', 'supporting'] },
  { url: `${BASE}/Raul_Bautista_01.0md1ii-yrn96r.jpg`, caption: 'Raul Bautista', category: 'characters', tags: ['raul bautista', 'character', 'supporting'] },
  { url: `${BASE}/Raul_Bautista_02.10ddy6ogywu-t.jpg`, caption: 'Raul Bautista', category: 'characters', tags: ['raul bautista', 'character', 'supporting'] },
  { url: `${BASE}/Raul_Bautista_03.0-x4xbav_6c40.jpg`, caption: 'Raul Bautista', category: 'characters', tags: ['raul bautista', 'character', 'supporting'] },
  { url: `${BASE}/Raul_Bautista_04.0qx77gyvykvv5.jpg`, caption: 'Raul Bautista', category: 'characters', tags: ['raul bautista', 'character', 'supporting'] },
  { url: `${BASE}/Brian_Heder_01.0r.ute88os9k-.jpg`, caption: 'Brian Heder', category: 'characters', tags: ['brian heder', 'character', 'supporting'] },
  { url: `${BASE}/Brian_Heder_02.0kmg6iw38f-9o.jpg`, caption: 'Brian Heder', category: 'characters', tags: ['brian heder', 'character', 'supporting'] },
  { url: `${BASE}/Brian_Heder_03.10ntuqh2h6upf.jpg`, caption: 'Brian Heder', category: 'characters', tags: ['brian heder', 'character', 'supporting'] },
  { url: `${BASE}/Brian_Heder_04.0z3o0t88jw54l.jpg`, caption: 'Brian Heder', category: 'characters', tags: ['brian heder', 'character', 'supporting'] },
  // Vice City
  { url: `${BASE}/Vice_City_01.135x56yoeu.6t.jpg`, caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location'] },
  { url: `${BASE}/Vice_City_02.0c5.7qx17u9kl.jpg`, caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location'] },
  { url: `${BASE}/Vice_City_03.0nqz~lrqdmlze.jpg`, caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location'] },
  { url: `${BASE}/Vice_City_04.06evqutgh7624.jpg`, caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location'] },
  { url: `${BASE}/Vice_City_05.0~r~o0jzpp4a-.jpg`, caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location'] },
  { url: `${BASE}/Vice_City_06.0_tdmr3u9w84x.jpg`, caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location'] },
  { url: `${BASE}/Vice_City_07.0b3mhak4k78oh.jpg`, caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location'] },
  { url: `${BASE}/Vice_City_08.0bbg_xp4hqdvz.jpg`, caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location'] },
  { url: `${BASE}/Vice_City_09.0~ng.c8ack3fp.jpg`, caption: 'Vice City', category: 'vice_city', tags: ['vice city', 'city', 'map', 'location'] },
  // Leonida Keys
  { url: `${BASE}/Leonida_Keys_01.0zgz7tveur6y8.jpg`, caption: 'Leonida Keys', category: 'leonida_keys', tags: ['leonida keys', 'islands', 'map', 'location'] },
  { url: `${BASE}/Leonida_Keys_02.0~ptk-53gl0lq.jpg`, caption: 'Leonida Keys', category: 'leonida_keys', tags: ['leonida keys', 'islands', 'map', 'location'] },
  { url: `${BASE}/Leonida_Keys_03.0v_3~-9ceyixc.jpg`, caption: 'Leonida Keys', category: 'leonida_keys', tags: ['leonida keys', 'islands', 'map', 'location'] },
  { url: `${BASE}/Leonida_Keys_04.0hce1rw1s8pd9.jpg`, caption: 'Leonida Keys', category: 'leonida_keys', tags: ['leonida keys', 'islands', 'map', 'location'] },
  { url: `${BASE}/Leonida_Keys_05.0yerhvjhto-h..jpg`, caption: 'Leonida Keys', category: 'leonida_keys', tags: ['leonida keys', 'islands', 'map', 'location'] },
  // Port Gellhorn
  { url: `${BASE}/Port_Gellhorn_01.0fmisvza-5-cq.jpg`, caption: 'Port Gellhorn', category: 'port_gellhorn', tags: ['port gellhorn', 'industrial', 'map', 'location'] },
  { url: `${BASE}/Port_Gellhorn_02.00e7cz6lwrup-.jpg`, caption: 'Port Gellhorn', category: 'port_gellhorn', tags: ['port gellhorn', 'industrial', 'map', 'location'] },
  { url: `${BASE}/Port_Gellhorn_03.00c2b0eh7sm~q.jpg`, caption: 'Port Gellhorn', category: 'port_gellhorn', tags: ['port gellhorn', 'industrial', 'map', 'location'] },
  { url: `${BASE}/Port_Gellhorn_04.0hd-7kzfi51q..jpg`, caption: 'Port Gellhorn', category: 'port_gellhorn', tags: ['port gellhorn', 'industrial', 'map', 'location'] },
  { url: `${BASE}/Port_Gellhorn_05.0nsv0ou54n-t3.jpg`, caption: 'Port Gellhorn', category: 'port_gellhorn', tags: ['port gellhorn', 'industrial', 'map', 'location'] },
  // Grassrivers
  { url: `${BASE}/Grassrivers_01.1096rw4lbjur_.jpg`, caption: 'Grassrivers', category: 'grassrivers', tags: ['grassrivers', 'swamp', 'rural', 'map', 'location'] },
  { url: `${BASE}/Grassrivers_02.0teqs5xe2pem1.jpg`, caption: 'Grassrivers', category: 'grassrivers', tags: ['grassrivers', 'swamp', 'rural', 'map', 'location'] },
  { url: `${BASE}/Grassrivers_03.14cuv-vg9orw4.jpg`, caption: 'Grassrivers', category: 'grassrivers', tags: ['grassrivers', 'swamp', 'rural', 'map', 'location'] },
  { url: `${BASE}/Grassrivers_04.01ckpqbhxyz76.jpg`, caption: 'Grassrivers', category: 'grassrivers', tags: ['grassrivers', 'swamp', 'rural', 'map', 'location'] },
  // Ambrosia
  { url: `${BASE}/Ambrosia_01.0rqphs0gazkm..jpg`, caption: 'Ambrosia', category: 'ambrosia', tags: ['ambrosia', 'map', 'location'] },
  { url: `${BASE}/Ambrosia_02.0wtqs05ozl.ym.jpg`, caption: 'Ambrosia', category: 'ambrosia', tags: ['ambrosia', 'map', 'location'] },
  { url: `${BASE}/Ambrosia_03.0vt46a.1s.7-y.jpg`, caption: 'Ambrosia', category: 'ambrosia', tags: ['ambrosia', 'map', 'location'] },
  { url: `${BASE}/Ambrosia_04.0.2cefoguu-tt.jpg`, caption: 'Ambrosia', category: 'ambrosia', tags: ['ambrosia', 'map', 'location'] },
  { url: `${BASE}/Ambrosia_05.0olhvjqff0o4b.jpg`, caption: 'Ambrosia', category: 'ambrosia', tags: ['ambrosia', 'map', 'location'] },
  // Mount Kalaga
  { url: `${BASE}/Mount_Kalaga_National_Park_01.0v5fl0f83hjv_.jpg`, caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'national park', 'map', 'location'] },
  { url: `${BASE}/Mount_Kalaga_National_Park_02.0f24dhopdprvx.jpg`, caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'national park', 'map', 'location'] },
  { url: `${BASE}/Mount_Kalaga_National_Park_03.037k2s87rwuxc.jpg`, caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'national park', 'map', 'location'] },
  { url: `${BASE}/Mount_Kalaga_National_Park_04.0e1sxnp1mln2u.jpg`, caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'national park', 'map', 'location'] },
  { url: `${BASE}/Mount_Kalaga_National_Park_05.0_~vto-o2zxok.jpg`, caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'national park', 'map', 'location'] },
  { url: `${BASE}/Mount_Kalaga_National_Park_06.166ouq5pjd7h0.jpg`, caption: 'Mount Kalaga National Park', category: 'mount_kalaga', tags: ['mount kalaga', 'national park', 'map', 'location'] },
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
  { url: `${BASE}/ULTIMATE_EDITION_ONE_EYED_WILLIE_01.0n7-__or5f.b6.jpg`, caption: "One-Eyed Willie's Mod Shop", category: 'ultimate_edition', tags: ["one-eyed willie", 'mod shop', 'off-road', 'ultimate edition'] },
  // Vintage Vice City Pack
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_01.05zaof7o1uz.3.jpg`, caption: 'Vintage Vice City Pack', category: 'vintage_vice_city', tags: ['vintage vice city', 'pre-order', 'pack'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_02.14mvx9a15z8jv.jpg`, caption: 'Vintage Vice City Pack', category: 'vintage_vice_city', tags: ['vintage vice city', 'pre-order', 'pack'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_VAPID_STANIER_01.004m_8d1~qngy.jpg`, caption: "'55 Vapid Stanier", category: 'vintage_vice_city', tags: ['vapid stanier', 'car', 'vehicle', 'vintage vice city'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_VAPID_STANIER_02.0s2wun4_vzld2.jpg`, caption: "'55 Vapid Stanier", category: 'vintage_vice_city', tags: ['vapid stanier', 'car', 'vehicle', 'vintage vice city'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_01.15zo0h-xdm91b.jpg`, caption: 'Vintage Vice City Outfits & Hairstyles', category: 'vintage_vice_city', tags: ['outfit', 'hairstyle', 'style', 'vintage vice city'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_02.12udfnroe-lah.jpg`, caption: 'Vintage Vice City Outfits & Hairstyles', category: 'vintage_vice_city', tags: ['outfit', 'hairstyle', 'style', 'vintage vice city'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_03.0au1tphsftqm5.jpg`, caption: 'Vintage Vice City Outfits & Hairstyles', category: 'vintage_vice_city', tags: ['outfit', 'hairstyle', 'style', 'vintage vice city'] },
  { url: `${BASE}/VINTAGE_VICE_CITY_WEAPON_PATTERN_01.0gybtumgwdcoi.jpg`, caption: 'Vintage Vice City Weapon Pattern', category: 'vintage_vice_city', tags: ['weapon', 'pattern', 'vintage vice city'] },
  // Artwork
  { url: `${BASE}/Official_Cover_Art_landscape.12.uu2irr.2_a.jpg`, caption: 'GTA VI Official Cover Art', category: 'artwork', tags: ['cover art', 'official', 'artwork', 'jason', 'lucia'] },
  { url: `${BASE}/Jason_and_Lucia_03_landscape.0419q._86ukpt.jpg`, caption: 'Jason and Lucia', category: 'artwork', tags: ['jason', 'lucia', 'artwork', 'protagonists'] },
  { url: `${BASE}/Vice_City_Postcard_landscape.0v2njmlk2n-qm.jpg`, caption: 'Vice City Postcard', category: 'artwork', tags: ['vice city', 'artwork', 'postcard'] },
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
