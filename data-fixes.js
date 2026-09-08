// Source corrections applied before game.js prepares player objects.
// Keep these separate from players.js, which is regenerated from the upstream database.
(function(){
  const fixes={
    'クリスチャン・イエリチ':{
      pu:'https://commons.wikimedia.org/wiki/File:Christian_Yelich_(51003827668)_(cropped).jpg',
      pa:'Jeffrey Hayes',pl:'CC BY 2.0'
    },
    'テオスカー・ヘルナンデス':{
      pu:'https://commons.wikimedia.org/wiki/File:Teoscar_Hern%C3%A1ndez_(53688673733).jpg',
      pa:'David from Washington, DC',pl:'CC BY 2.0'
    },
    'ウィル・スミス (投手)':{
      pu:'https://commons.wikimedia.org/wiki/File:Will_Smith_July_30,_2019_(48423544347)_(cropped).jpg',
      pa:"Ian D'Andrea",pl:'CC BY-SA 2.0'
    },
    'マーカス・セミエン':{
      pu:'https://commons.wikimedia.org/wiki/File:Marcus_Semien_on_August_15,_2015_(cropped).jpg',
      pa:'Keith Allison / Editosaurus',pl:'CC BY-SA 2.0'
    },
    'ボビー・コックス':{
      pu:'https://commons.wikimedia.org/wiki/File:Bobby_Cox.jpg',
      pa:'Chris J. Nelson',pl:'CC BY 3.0'
    }
  };
  DB.concat(MLB_DB).forEach(function(p){
    const fix=fixes[p.name];
    if(!fix)return;
    Object.assign(p,fix);
    // The old local thumbnail was generated from the incorrect source.
    delete p.ph;
  });
})();
