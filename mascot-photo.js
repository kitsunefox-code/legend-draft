// tools/fetch_mascot.js が生成。マスコット写真の出典(作者・ライセンス・ページ)
const MASCOT_PHOTO = {
 "tsubakuro": {
  "a": "m-louis .® from Osaka, Japan",
  "l": "CC BY-SA 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:Tetsuto_Yamada_.jpg",
  "f": "Tetsuto_Yamada_.jpg",
  "how": "ja"
 },
 "doala": {
  "a": "Harald Krichel",
  "l": "CC BY-SA 4.0",
  "u": "https://commons.wikimedia.org/wiki/File:British_singer_and_songwriter_Dua_Lipa_at_the_SWR3_New_Pop_Festival_2016.jpg",
  "f": "British singer and songwriter Dua Lipa at the SWR3 New Pop Festival 2016.jpg",
  "how": "commons"
 },
 "torakky": {
  "a": "Dudley Hardy / Adam Cuerden",
  "l": "Public domain",
  "u": "https://commons.wikimedia.org/wiki/File:Poster_for_The_Lucky_Star_(1899)_by_Dudley_Hardy.jpg",
  "f": "Poster for The Lucky Star (1899) by Dudley Hardy.jpg",
  "how": "commons"
 },
 "slyly": {
  "a": "えすぱにぃ",
  "l": "CC BY-SA 4.0",
  "u": "https://commons.wikimedia.org/wiki/File:%E3%82%B9%E3%83%A9%E3%82%A3%E3%83%AA%E3%83%BC%EF%BC%93.jpg",
  "f": "スラィリー３.jpg",
  "how": "ja"
 },
 "starman": {
  "a": "Baylexs",
  "l": "CC BY-SA 4.0",
  "u": "https://commons.wikimedia.org/wiki/File:201024_DBStarman.jpg",
  "f": "201024 DBStarman.jpg",
  "how": "commons"
 },
 "giabbit": {
  "a": "Chi-Hung Lin",
  "l": "CC BY-SA 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:%E5%95%A4%E9%85%92%E5%A6%B9_Beer_girl_2016_(29702204746).jpg",
  "f": "啤酒妹 Beer girl 2016 (29702204746).jpg",
  "how": "commons"
 },
 "harryhawk": {
  "a": "Unknown author Unknown author",
  "l": "Public domain",
  "u": "https://commons.wikimedia.org/wiki/File:Harry_Hawk_Harvard_(cropped).png",
  "f": "Harry_Hawk_Harvard_(cropped).png",
  "how": "en"
 },
 "leo": {
  "a": "Comyu",
  "l": "CC BY-SA 4.0",
  "u": "https://commons.wikimedia.org/wiki/File:Saitama_Seibu_Lions_Victory_Parade_2018_with_Leo_Lina_and_bluelegends.jpg",
  "f": "Saitama Seibu Lions Victory Parade 2018 with Leo Lina and bluelegends.jpg",
  "how": "commons"
 },
 "markun": {
  "a": "Original: Nakanan Vector: ヒッパソス",
  "l": "Public domain",
  "u": "https://commons.wikimedia.org/wiki/File:Chiba_Lotte_Marines_insignia.svg",
  "f": "Chiba_Lotte_Marines_insignia.svg",
  "how": "ja"
 },
 "frep": {
  "a": "Orixbaseballclub",
  "l": "CC BY-SA 4.0",
  "u": "https://commons.wikimedia.org/wiki/File:Fighters_FREP_THE_FOX_20220402.jpg",
  "f": "Fighters_FREP_THE_FOX_20220402.jpg",
  "how": "ja"
 },
 "bull": {
  "a": "Orixbaseballclub",
  "l": "CC BY-SA 4.0",
  "u": "https://commons.wikimedia.org/wiki/File:Buffallo_BULL_Orix_Buffaloes_20221013.jpg",
  "f": "Buffallo_BULL_Orix_Buffaloes_20221013.jpg",
  "how": "ja"
 },
 "clutch": {
  "a": "Kanesue",
  "l": "CC BY 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:Clutch_mascot.jpg",
  "f": "Clutch mascot.jpg",
  "how": "commons"
 },
 "bb": null,
 "gyorotan": {
  "a": "Original: Torsodog Vector: ヒッパソス",
  "l": "Public domain",
  "u": "https://commons.wikimedia.org/wiki/File:Hokkaido_Nippon-Ham_Fighters_insignia.svg",
  "f": "Hokkaido_Nippon-Ham_Fighters_insignia.svg",
  "how": "ja"
 },
 "buffilead": {
  "a": "Unknown author Unknown author",
  "l": "Public domain",
  "u": "https://commons.wikimedia.org/wiki/File:Osaka_Kintetsu_Buffaloes_insignia.png",
  "f": "Osaka_Kintetsu_Buffaloes_insignia.png",
  "how": "ja"
 },
 "bravy": null,
 "bell": {
  "a": "Orixbaseballclub",
  "l": "CC BY-SA 4.0",
  "u": "https://commons.wikimedia.org/wiki/File:Buffalo_BELL_Orix_Buffaloes_20221013.jpg",
  "f": "Buffalo_BELL_Orix_Buffaloes_20221013.jpg",
  "how": "ja"
 },
 "lucky": {
  "a": "Dudley Hardy / Adam Cuerden",
  "l": "Public domain",
  "u": "https://commons.wikimedia.org/wiki/File:Poster_for_The_Lucky_Star_(1899)_by_Dudley_Hardy.jpg",
  "f": "Poster for The Lucky Star (1899) by Dudley Hardy.jpg",
  "how": "commons"
 },
 "hosshey": {
  "a": "ぽこ太郎",
  "l": "CC BY-SA 3.0",
  "u": "https://commons.wikimedia.org/wiki/File:%E3%83%9B%E3%83%83%E3%82%B7%E3%83%BC_(hosshey)_in_2010.08.08.JPG",
  "f": "ホッシー (hosshey) in 2010.08.08.JPG",
  "how": "commons"
 },
 "carpboya": {
  "a": "HKT3012",
  "l": "CC BY-SA 4.0",
  "u": "https://commons.wikimedia.org/wiki/File:FUWAFUWA_-_Carp_Boya_(2015).JPG",
  "f": "FUWAFUWA - Carp Boya (2015).JPG",
  "how": "commons"
 },
 "paolon": null,
 "phanatic": {
  "a": "Go Phightins!",
  "l": "CC BY-SA 3.0",
  "u": "https://commons.wikimedia.org/wiki/File:Phillie_Phanatic_participates_in_Star_Wars_Night.JPG",
  "f": "Phillie_Phanatic_participates_in_Star_Wars_Night.JPG",
  "how": "ja"
 },
 "mrmet": {
  "a": "Bryan Berlin",
  "l": "CC BY-SA 4.0",
  "u": "https://commons.wikimedia.org/wiki/File:Mr_Met_Gotham_NC_Courage_Mar_21_2026-19_(cropped).jpg",
  "f": "Mr_Met_Gotham_NC_Courage_Mar_21_2026-19_(cropped).jpg",
  "how": "en"
 },
 "moose": {
  "a": "Cacophony",
  "l": "CC BY-SA 3.0",
  "u": "https://commons.wikimedia.org/wiki/File:MarinerMooseFlag.jpg",
  "f": "MarinerMooseFlag.jpg",
  "how": "ja"
 },
 "wally": {
  "a": "malo",
  "l": "CC BY-SA 3.0",
  "u": "https://commons.wikimedia.org/wiki/File:Wally_the_green_monster.jpg",
  "f": "Wally_the_green_monster.jpg",
  "how": "en"
 },
 "orbit": {
  "a": "EricEnfermero",
  "l": "CC BY-SA 3.0",
  "u": "https://commons.wikimedia.org/wiki/File:Orbit_Houston_Astros_mascot_preseason_2014.jpg",
  "f": "Orbit_Houston_Astros_mascot_preseason_2014.jpg",
  "how": "en"
 },
 "billy": {
  "a": "U.S. Air Force photo/Senior Airman Carlin Leslie",
  "l": "Public domain",
  "u": "https://commons.wikimedia.org/wiki/File:Billy_the_Marlin_Andersen_AFB_December_2011.jpg",
  "f": "Billy_the_Marlin_Andersen_AFB_December_2011.jpg",
  "how": "en"
 },
 "bernie": {
  "a": "Steve Paluch",
  "l": "CC BY-SA 3.0",
  "u": "https://commons.wikimedia.org/wiki/File:Bernie_Brewer_in_crowd.jpg",
  "f": "Bernie_Brewer_in_crowd.jpg",
  "how": "en"
 },
 "southpaw": {
  "a": "stringbot on Flickr",
  "l": "CC BY 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:Southpaw.jpg",
  "f": "Southpaw.jpg",
  "how": "commons"
 },
 "paws": {
  "a": "Notorious4life ( talk ) ( Uploads )",
  "l": "CC0",
  "u": "https://commons.wikimedia.org/wiki/File:Paws_(Detroit_Tigers)_09_2022.jpg",
  "f": "Paws (Detroit Tigers) 09 2022.jpg",
  "how": "commons"
 },
 "slider": {
  "a": "Erik Drost",
  "l": "CC BY 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:Slider_and_the_Dogs_with_the_Cleveland_Strikers_(52649545351).jpg",
  "f": "Slider and the Dogs with the Cleveland Strikers (52649545351).jpg",
  "how": "commons"
 },
 "stomper": {
  "a": "Adam Moss from Walden, New York, United States",
  "l": "CC BY-SA 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:Stomper_Texas_Rangers_at_Oakland_Athletics_-_May_12,_2023_(52909762402)_(cropped).jpg",
  "f": "Stomper Texas Rangers at Oakland Athletics - May 12, 2023 (52909762402) (cropped).jpg",
  "how": "commons"
 },
 "raymond": {
  "a": "Eric Kilby",
  "l": "CC BY-SA 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:RaymondTampaBayDevilRaysMascotSeptember2007.jpg",
  "f": "RaymondTampaBayDevilRaysMascotSeptember2007.jpg",
  "how": "commons"
 },
 "screech": {
  "a": "The White House from Washington, DC",
  "l": "Public domain",
  "u": "https://commons.wikimedia.org/wiki/File:President_Trump_at_the_World_Series_Game_(48974865406).jpg",
  "f": "President_Trump_at_the_World_Series_Game_(48974865406).jpg",
  "how": "en"
 },
 "dinger": {
  "a": "User Onetwo1 on en.wikipedia",
  "l": "CC BY-SA 3.0",
  "u": "https://commons.wikimedia.org/wiki/File:Rockiesdinger.JPG",
  "f": "Rockiesdinger.JPG",
  "how": "commons"
 },
 "sluggerrr": {
  "a": "Mike Kalasnik",
  "l": "CC BY-SA 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:Sluggerrr_(Kansas_City_Royals).jpg",
  "f": "Sluggerrr (Kansas City Royals).jpg",
  "how": "commons"
 },
 "captain": {
  "a": "EricEnfermero",
  "l": "CC BY-SA 4.0",
  "u": "https://commons.wikimedia.org/wiki/File:Rangers_Captain_team_mascot_May_23_2016.jpg",
  "f": "Rangers Captain team mascot May 23 2016.jpg",
  "how": "commons"
 },
 "louseal": {
  "a": "Glenn's GISuser.com Map, Mash-up & GIS PhotoBlog (GISuser.co",
  "l": "CC BY 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:Lou_seal_giants_mascot.jpg",
  "f": "Lou seal giants mascot.jpg",
  "how": "commons"
 },
 "friar": {
  "a": "Ewen Roberts",
  "l": "CC BY 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:Swinging_friar_san_diego_padres_mascot.jpg",
  "f": "Swinging friar san diego padres mascot.jpg",
  "how": "commons"
 },
 "oriolebird": {
  "a": "Keith Allison",
  "l": "CC BY-SA 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:The_Oriole_Bird_2014.jpg",
  "f": "The Oriole Bird 2014.jpg",
  "how": "commons"
 },
 "tcbear": {
  "a": "Bobak Ha'Eri",
  "l": "CC BY 3.0",
  "u": "https://commons.wikimedia.org/wiki/File:061307-Twins-TC.jpg",
  "f": "061307-Twins-TC.jpg",
  "how": "en"
 },
 "ace": {
  "a": "James G",
  "l": "CC BY 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:Ace_(7952158058).jpg",
  "f": "Ace_(7952158058).jpg",
  "how": "en"
 },
 "fredbird": {
  "a": "Johnmaxmena2",
  "l": "CC BY-SA 3.0",
  "u": "https://commons.wikimedia.org/wiki/File:Fredbird2013cardinals.jpg",
  "f": "Fredbird2013cardinals.jpg",
  "how": "en"
 },
 "parrot": {
  "a": "brunkfordbraun on Flickr",
  "l": "CC BY-SA 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:Pirate_parrot_pirates_mascot.jpg",
  "f": "Pirate_parrot_pirates_mascot.jpg",
  "how": "en"
 },
 "redlegs": null,
 "clark": {
  "a": "Arturo Pardavila III",
  "l": "CC BY 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:Clark-the-Cub-01.jpg",
  "f": "Clark-the-Cub-01.jpg",
  "how": "commons"
 },
 "blooper": {
  "a": "Nemov",
  "l": "CC BY-SA 4.0",
  "u": "https://commons.wikimedia.org/wiki/File:Blooper_in_2022.jpg",
  "f": "Blooper_in_2022.jpg",
  "how": "en"
 },
 "baxter": {
  "a": "Gage Skidmore from Surprise, AZ, United States of America",
  "l": "CC BY-SA 2.0",
  "u": "https://commons.wikimedia.org/wiki/File:D._Baxter_the_Bobcat_with_attendee_(51809482811).jpg",
  "f": "D. Baxter the Bobcat with attendee (51809482811).jpg",
  "how": "commons"
 },
 "gapper": {
  "a": "U.S. Air Force photo by R.J. Oriez",
  "l": "Public domain",
  "u": "https://commons.wikimedia.org/wiki/File:Air_Force_recruits_with_Cincinnati_Reds_mascot_Gapper_(220902-F-JW079-1028).jpg",
  "f": "Air Force recruits with Cincinnati Reds mascot Gapper (220902-F-JW079-1028).jpg",
  "how": "commons"
 }
};
