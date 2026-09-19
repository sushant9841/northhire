/* Canadian city/town gazette for location autocomplete (LocationInput) and server-side location
   normalization. Real Canadian municipalities, grouped by province/territory below for
   maintainability, then flattened + sorted into CANADIAN_CITIES. Population-weighted toward
   Ontario/Quebec/BC/Alberta since that's where the overwhelming majority of job postings and
   seekers are, but every province and territory has real coverage. Extend this list rather than
   hardcoding cities anywhere else in the app. */

const ON = [
  "Toronto","Ottawa","Mississauga","Brampton","Hamilton","London","Markham","Vaughan","Kitchener",
  "Windsor","Richmond Hill","Oakville","Burlington","Oshawa","Barrie","St. Catharines","Cambridge",
  "Kingston","Whitby","Guelph","Ajax","Thunder Bay","Chatham","Waterloo","Brantford","Pickering",
  "Niagara Falls","Peterborough","Sault Ste. Marie","Sarnia","Welland","Belleville","North Bay",
  "Cornwall","Woodstock","Stratford","Orillia","Milton","Newmarket","Aurora","Georgina","Innisfil",
  "Bradford West Gwillimbury","Orangeville","Collingwood","Owen Sound","Leamington","Tillsonburg",
  "Timmins","Kenora","Elliot Lake","Cobourg","Port Hope","Petawawa","Pembroke","Renfrew","Brockville",
  "Gananoque","Prescott","Smiths Falls","Perth","Carleton Place","Almonte","Fergus","Elora","Listowel",
  "Goderich","Clinton","Wingham","Walkerton","Hanover","Kincardine","Meaford","Wasaga Beach","Midland",
  "Penetanguishene","Huntsville","Bracebridge","Gravenhurst","Parry Sound","Espanola","Blind River",
  "Iroquois Falls","Kapuskasing","Hearst","Cochrane","Temiskaming Shores","Dryden","Fort Frances",
  "Sioux Lookout","Red Lake","Marathon","Terrace Bay","Wawa","Chapleau","Elliot Lake","Sudbury",
  "Greater Sudbury","New Tecumseth","East Gwillimbury","Whitchurch-Stouffville","King City","Uxbridge",
  "Caledon","Halton Hills","Grimsby","Lincoln","Pelham","Fort Erie","Port Colborne","Thorold",
  "West Lincoln","Wainfleet","Norfolk County","Simcoe","Delhi","Port Dover","Ingersoll","St. Thomas",
  "Aylmer","Strathroy","Woodstock","Tavistock","New Hamburg","St. Marys","Mitchell","Zurich",
  "Exeter","Seaforth","Milverton","Palmerston","Mount Forest","Arthur","Erin","Georgetown",
  "Acton","Rockwood","Guelph/Eramosa","Puslinch","Dundas","Ancaster","Stoney Creek","Binbrook",
  "Waterdown","Flamborough","Grimsby","Beamsville","Vineland","Jordan","Niagara-on-the-Lake",
  "Chatham-Kent","Wallaceburg","Dresden","Blenheim","Ridgetown","Amherstburg","LaSalle","Tecumseh",
  "Essex","Kingsville","Belle River","Lakeshore","Wheatley","Cottam","Petrolia","Wyoming","Forest",
  "Alvinston","Watford","Thedford","Lambton Shores","Grand Bend","Bayfield","Hensall","Kirkton",
  "Ajax","Whitby","Uxbridge","Beaverton","Sunderland","Cannington","Lindsay","Kawartha Lakes",
  "Bobcaygeon","Fenelon Falls","Omemee","Millbrook","Port Hope","Cobourg","Colborne","Brighton",
  "Trenton","Quinte West","Deseronto","Napanee","Greater Napanee","Bath","Amherstview","Gananoque",
  "Westport","Sharbot Lake","Tweed","Madoc","Marmora","Bancroft","Bracebridge","Baysville",
  "Dorset","Minden","Haliburton","Wilberforce","Coboconk","Fenelon Falls","Norwood","Havelock",
  "Campbellford","Hastings","Warkworth","Stirling","Tamworth","Sydenham","Verona","Yarker",
  "Elgin","Portland","Battersea"
];
const QC = [
  "Montreal","Quebec City","Laval","Gatineau","Longueuil","Sherbrooke","Saguenay","Levis",
  "Trois-Rivieres","Terrebonne","Saint-Jean-sur-Richelieu","Repentigny","Brossard","Drummondville",
  "Saint-Jerome","Granby","Blainville","Saint-Hyacinthe","Shawinigan","Dollard-des-Ormeaux",
  "Rimouski","Chateauguay","Mascouche","Mirabel","Victoriaville","Saint-Bruno-de-Montarville",
  "Rouyn-Noranda","Saint-Eustache","Salaberry-de-Valleyfield","Sept-Iles","Val-d'Or","Alma",
  "Boucherville","Sorel-Tracy","Baie-Comeau","Thetford Mines","Vaudreuil-Dorion","Joliette",
  "Beloeil","Saint-Constant","Magog","Sainte-Julie","Chambly","La Prairie","Candiac",
  "Mont-Royal","Westmount","Pointe-Claire","Kirkland","Beaconsfield","Dorval","Baie-D'Urfe",
  "Cote Saint-Luc","Hampstead","Montreal-Est","Montreal-Ouest","Sainte-Anne-de-Bellevue",
  "Gaspe","Matane","Riviere-du-Loup","Amqui","Cabano","Rimouski","Trois-Pistoles",
  "Sainte-Marie","Beauceville","Saint-Georges","Lac-Megantic","Coaticook","Sherbrooke",
  "Cowansville","Bedford","Farnham","Bromont","Sutton","Waterloo","Windsor","Richmond",
  "Asbestos","Val-des-Sources","Danville","Weedon","East Angus","La Sarre","Amos",
  "Malartic","Senneterre","Ville-Marie","Temiscaming","Notre-Dame-du-Nord","Chibougamau",
  "Chapais","Roberval","Dolbeau-Mistassini","Saint-Felicien","La Baie","Jonquiere",
  "Chicoutimi","La Malbaie","Baie-Saint-Paul","Clermont","Charlevoix","Portneuf",
  "Donnacona","Pont-Rouge","Saint-Raymond","Deschambault-Grondines","L'Ancienne-Lorette",
  "Saint-Augustin-de-Desmaures","Sainte-Foy","Beauport","Charlesbourg","Loretteville",
  "Neufchatel","Val-Belair","Cap-Rouge","Wendake","Levis","Saint-Nicolas","Lauzon",
  "Charny","Saint-Romuald","Sainte-Croix","Fortierville","Plessisville","Princeville",
  "Warwick","Kingsey Falls","Nicolet","Becancour","Gentilly","Saint-Pierre-les-Becquets",
  "Sorel-Tracy","Contrecoeur","Verchères","Varennes","Saint-Amable","Saint-Bruno",
  "Otterburn Park","Mont-Saint-Hilaire","McMasterville","Saint-Basile-le-Grand",
  "Carignan","Saint-Mathieu-de-Beloeil","Marieville","Rougemont","Saint-Cesaire",
  "Farnham","Bedford","Frelighsburg","Dunham","Stanbridge Station","Notre-Dame-de-Stanbridge"
];
const BC = [
  "Vancouver","Surrey","Burnaby","Richmond","Abbotsford","Coquitlam","Kelowna","Langley",
  "Saanich","Delta","Kamloops","Nanaimo","Victoria","Chilliwack","Maple Ridge","New Westminster",
  "Port Coquitlam","North Vancouver","West Vancouver","Vernon","Penticton","Campbell River",
  "Prince George","Courtenay","Cranbrook","Fort St. John","Squamish","Duncan","Powell River",
  "Terrace","Salmon Arm","Colwood","Comox","Langford","Parksville","Port Alberni","Sidney",
  "Whistler","Williams Lake","Quesnel","Merritt","Sechelt","Ladysmith","Trail","Castlegar",
  "Nelson","Rossland","Grand Forks","Oliver","Osoyoos","Summerland","Peachland","West Kelowna",
  "Lake Country","Enderby","Armstrong","Sicamous","Revelstoke","Golden","Invermere","Fernie",
  "Kimberley","Creston","Sparwood","Elkford","Chetwynd","Dawson Creek","Fort Nelson","Tumbler Ridge",
  "Mackenzie","Prince Rupert","Kitimat","Smithers","Houston","Burns Lake","Vanderhoof","Fraser Lake",
  "Hazelton","Stewart","Masset","Queen Charlotte","Port Hardy","Port McNeill","Port Alice",
  "Gold River","Tahsis","Ucluelet","Tofino","Bamfield","Zeballos","Sayward","Sooke","Metchosin",
  "Central Saanich","North Saanich","View Royal","Esquimalt","Oak Bay","Pitt Meadows","Mission",
  "Hope","Agassiz","Harrison Hot Springs","Chilliwack","Boston Bar","Lytton","Lillooet","Ashcroft",
  "Cache Creek","Clinton","100 Mile House","Barriere","Clearwater","Chase","Logan Lake"
];
const AB = [
  "Calgary","Edmonton","Red Deer","Lethbridge","St. Albert","Medicine Hat","Grande Prairie",
  "Airdrie","Spruce Grove","Leduc","Fort Saskatchewan","Lloydminster","Camrose","Cochrane",
  "Okotoks","Chestermere","Beaumont","Sherwood Park","Wetaskiwin","High River","Canmore",
  "Brooks","Cold Lake","Whitecourt","Lacombe","Stony Plain","Strathmore","Innisfail",
  "Ponoka","Olds","Drumheller","Vermilion","Vegreville","Wainwright","Bonnyville",
  "St. Paul","Athabasca","Barrhead","Westlock","Slave Lake","Peace River","Fairview",
  "High Level","Rainbow Lake","Manning","La Crete","Grimshaw","Sexsmith","Beaverlodge",
  "Fairview","Valleyview","Fox Creek","Swan Hills","Edson","Hinton","Jasper","Banff",
  "Crowsnest Pass","Pincher Creek","Claresholm","Fort Macleod","Taber","Coaldale",
  "Raymond","Magrath","Cardston","Milk River","Bow Island","Redcliff","Rocky Mountain House",
  "Sundre","Didsbury","Carstairs","Crossfield","Irricana","Three Hills","Trochu","Hanna",
  "Oyen","Consort","Provost","Wainwright","Two Hills","Vegreville","Tofield","Viking"
];
const MB = [
  "Winnipeg","Brandon","Steinbach","Thompson","Portage la Prairie","Winkler","Selkirk",
  "Morden","Dauphin","The Pas","Flin Flon","Neepawa","Swan River","Carman","Stonewall",
  "Niverville","Ile des Chenes","La Broquerie","Beausejour","Lac du Bonnet","Pinawa",
  "Gimli","Arborg","Ashern","Eriksdale","Teulon","Stonewall","Warren","Gladstone",
  "Minnedosa","Souris","Virden","Melita","Killarney","Boissevain","Deloraine","Hartney",
  "Rivers","Hamiota","Russell","Roblin","Grandview","Ste. Rose du Lac","McCreary",
  "Erickson","Onanole","Shoal Lake","Birtle","Elkhorn","Reston","Pilot Mound","Manitou"
];
const SK = [
  "Saskatoon","Regina","Prince Albert","Moose Jaw","Swift Current","Yorkton","North Battleford",
  "Estevan","Weyburn","Lloydminster","Martensville","Warman","Melfort","Humboldt","Meadow Lake",
  "Kindersley","Melville","Tisdale","Nipawin","La Ronge","Rosetown","Assiniboia","Watrous",
  "Wynyard","Canora","Preeceville","Kamsack","Foam Lake","Wadena","Hudson Bay","Carrot River",
  "Shellbrook","Rosthern","Wakaw","Watson","Cudworth","Wilkie","Biggar","Unity","Kerrobert",
  "Maple Creek","Gull Lake","Shaunavon","Ponteix","Eastend","Herbert","Gravelbourg",
  "Radville","Milestone","Lumsden","Fort Qu'Appelle","Indian Head","Grenfell","Broadview",
  "Whitewood","Moosomin","Esterhazy","Langenburg","Ituna"
];
const NB = [
  "Moncton","Saint John","Fredericton","Dieppe","Riverview","Miramichi","Edmundston",
  "Bathurst","Campbellton","Oromocto","Quispamsis","Rothesay","Sackville","Sussex",
  "Woodstock","Grand Falls","St. Stephen","Shediac","Caraquet","Tracadie","Grand Bay-Westfield",
  "Hampton","Fredericton Junction","Nackawic","Perth-Andover","Florenceville-Bristol",
  "Hartland","McAdam","St. Andrews","St. George","Blacks Harbour","Sackville","Petitcodiac"
];
const NS = [
  "Halifax","Cape Breton (Sydney)","Truro","New Glasgow","Glace Bay","Dartmouth","Bedford",
  "Sydney Mines","Kentville","Amherst","Yarmouth","Bridgewater","Antigonish","Windsor",
  "Digby","Shelburne","Liverpool","Lunenburg","Mahone Bay","Chester","Wolfville","Berwick",
  "Middleton","Annapolis Royal","Springhill","Oxford","Parrsboro","Pictou","Stellarton",
  "Westville","Trenton","Port Hawkesbury","Baddeck","Inverness","Port Hood","Ingonish",
  "Sheet Harbour","Musquodoboit Harbour","Elmsdale","Enfield","Stewiacke"
];
const NL = [
  "St. John's","Mount Pearl","Corner Brook","Conception Bay South","Paradise","Grand Falls-Windsor",
  "Gander","Happy Valley-Goose Bay","Labrador City","Stephenville","Carbonear","Clarenville",
  "Bay Roberts","Portugal Cove-St. Philip's","Torbay","Marystown","Deer Lake","Channel-Port aux Basques",
  "Wabush","Placentia","Bonavista","Twillingate","Fogo","Lewisporte","Botwood","Springdale",
  "Baie Verte","La Scie","Roddickton","St. Anthony","Rocky Harbour","Woody Point"
];
const PE = [
  "Charlottetown","Summerside","Stratford","Cornwall","Montague","Kensington","Souris",
  "Alberton","Georgetown","Tignish","O'Leary","Borden-Carleton","Murray Harbour","Rustico"
];
const YT = ["Whitehorse","Dawson City","Watson Lake","Haines Junction","Carmacks","Mayo","Faro","Teslin"];
const NT = ["Yellowknife","Hay River","Inuvik","Fort Smith","Behchoko","Fort Simpson","Norman Wells"];
const NU = ["Iqaluit","Rankin Inlet","Arviat","Baker Lake","Cambridge Bay","Pond Inlet","Cape Dorset"];

const BY_PROV = {
  Alberta: AB, "British Columbia": BC, Manitoba: MB, "New Brunswick": NB,
  "Newfoundland & Labrador": NL, "Nova Scotia": NS, Ontario: ON, "Prince Edward Island": PE,
  Quebec: QC, Saskatchewan: SK, "Northwest Territories": NT, Nunavut: NU, Yukon: YT,
};

/* Flattened, de-duplicated, sorted {name, province} pairs — the actual gazette consumed by
   LocationInput's autocomplete and any server-side lookup. */
export const CANADIAN_CITIES = Object.entries(BY_PROV)
  .flatMap(([province, cities]) => cities.map(name => ({ name, province })))
  .filter((c, i, arr) => arr.findIndex(x => x.name === c.name && x.province === c.province) === i)
  .sort((a, b) => a.name.localeCompare(b.name));

export const CANADIAN_CITY_NAMES = CANADIAN_CITIES.map(c => c.name);

export function findCityProvince(name) {
  const hit = CANADIAN_CITIES.find(c => c.name.toLowerCase() === String(name || "").trim().toLowerCase());
  return hit ? hit.province : null;
}
