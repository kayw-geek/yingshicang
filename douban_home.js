// 自用豆瓣首页（drpy2 规则），数据实时取自豆瓣小程序接口
// 点击条目会用片名去所有可搜索站点（夸克网盘站等）搜索
const LIB = `
const API = "https://frodo.douban.com/rexxar/api/v2";
const APIKEY = "0ac44ae016490db2204ce0a042db2916";
const COUNT = 30;
function req(path, query) {
  try {
    query = query || {};
    query.apikey = APIKEY;
    fetch_params.headers = oheaders;
    return JSON.parse(fetch(buildUrl(API + path, query), fetch_params));
  } catch (e) {
    print("豆瓣请求失败:" + e.message);
    return {};
  }
}
function toVod(item) {
  if (!item || (item.type !== "movie" && item.type !== "tv")) return null;
  let rate = item.rating && item.rating.value ? item.rating.value.toFixed(1) : "";
  let extra = item.episodes_info || item.null_rating_reason || "";
  return {
    vod_id: "msearch:" + item.id,
    vod_name: item.title,
    vod_pic: (item.pic ? (item.pic.normal || item.pic.large) : (item.cover_url || "")).replace("s_ratio_poster", "m_ratio_poster"),
    vod_remarks: [rate ? rate + "分" : "", extra].filter(Boolean).join(" ")
  };
}
function toList(items) {
  let out = [];
  (items || []).forEach(function (it) {
    let v = toVod(it.subject || it);
    if (v) out.push(v);
  });
  return out;
}
function collection(id, page) {
  let res = req("/subject_collection/" + id + "/items", { start: (page - 1) * COUNT, count: COUNT });
  return { list: toList(res.subject_collection_items), total: res.total || 0 };
}
`;

const HOME = `
let seen = {};
let vods = [];
[["subject_real_time_hotest", 20], ["tv_hot", 30], ["movie_hot_gaia", 30]].forEach(function (c) {
  let res = req("/subject_collection/" + c[0] + "/items", { start: 0, count: c[1] });
  toList(res.subject_collection_items).forEach(function (v) {
    if (!seen[v.vod_name]) { seen[v.vod_name] = 1; vods.push(v); }
  });
});
VODS = vods;
`;

const CATE = `
let fl = MY_FL || {};
let r;
if (MY_CATE === "movie_hot") {
  let res = req("/movie/hot_gaia", { area: fl.area || "全部", sort: fl.sort || "recommend", start: (MY_PAGE - 1) * COUNT, count: COUNT });
  r = { list: toList(res.items), total: res.total || 0 };
} else if (MY_CATE === "movie" || MY_CATE === "tv") {
  let sel = MY_CATE === "movie"
    ? { "类型": fl["类型"] || "", "地区": fl["地区"] || "" }
    : { "类型": fl["类型"] || "", "形式": fl["形式"] || "电视剧", "地区": fl["地区"] || "" };
  let tags = [fl["类型"], MY_CATE === "tv" ? fl["形式"] : "", fl["地区"], fl["年代"]].filter(Boolean).join(",");
  let res = req("/" + MY_CATE + "/recommend", {
    tags: tags, sort: fl.sort || "U", refresh: 0,
    selected_categories: JSON.stringify(sel),
    start: (MY_PAGE - 1) * COUNT, count: COUNT
  });
  r = { list: toList(res.items), total: res.total || 0 };
} else {
  r = collection(fl.id || (MY_CATE === "rank" ? "subject_real_time_hotest" : MY_CATE), MY_PAGE);
}
setResult2({ page: MY_PAGE, pagecount: Math.ceil(r.total / COUNT) || 1, limit: COUNT, total: r.total, list: r.list });
`;

const yearValues = [{ n: "全部", v: "" }];
for (let y = new Date().getFullYear(); y >= 2015; y--) yearValues.push({ n: String(y), v: String(y) });
["2010年代", "2000年代", "90年代", "80年代", "更早"].forEach(function (y) { yearValues.push({ n: y, v: y }); });

const kv = function (arr) { return arr.map(function (x) { return Array.isArray(x) ? { n: x[0], v: x[1] } : { n: x || "全部", v: x }; }); };

var rule = {
  title: "我的豆瓣",
  host: "https://frodo.douban.com",
  homeUrl: "",
  url: "/fyclass?pg=fypage",
  filter_url: "",
  searchable: 0,
  quickSearch: 0,
  filterable: 1,
  timeout: 8000,
  headers: {
    "Referer": "https://servicewechat.com/wx2f9b06c1de1ccfca/84/page-frame.html",
    "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36 MicroMessenger/7.0.9.501 NetType/WIFI MiniProgramEnv/Windows WindowsWechat"
  },
  图片来源: "@Referer=https://api.douban.com/@User-Agent=Mozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)%20AppleWebKit/537.36%20(KHTML,%20like%20Gecko)%20Chrome/120.0.0.0%20Safari/537.36",
  class_name: "热门电影&影院热映&热门剧集&热门综艺&动画&纪录片&口碑榜单&电影筛选&剧集筛选&Top250",
  class_url: "movie_hot&movie_showing&tv_hot&show_hot&tv_animation&tv_documentary&rank&movie&tv&movie_top250",
  filter: {
    movie_hot: [
      { key: "sort", name: "排序", value: kv([["热度", "recommend"], ["最新", "time"], ["评分", "rank"]]) },
      { key: "area", name: "地区", value: kv(["全部", "华语", "欧美", "韩国", "日本"]) }
    ],
    movie_showing: [
      { key: "id", name: "状态", value: kv([["正在热映", "movie_showing"], ["即将上映", "movie_soon"], ["近期热门", "movie_latest"]]) }
    ],
    tv_hot: [
      { key: "id", name: "地区", value: kv([["综合", "tv_hot"], ["国产剧", "tv_domestic"], ["美剧", "tv_american"], ["韩剧", "tv_korean"], ["日剧", "tv_japanese"]]) }
    ],
    show_hot: [
      { key: "id", name: "地区", value: kv([["综合", "show_hot"], ["国内", "show_domestic"], ["国外", "show_foreign"]]) }
    ],
    rank: [
      { key: "id", name: "榜单", value: kv([
        ["实时热门", "subject_real_time_hotest"],
        ["实时热门电影", "movie_real_time_hotest"],
        ["实时热门剧集", "tv_real_time_hotest"],
        ["一周口碑电影", "movie_weekly_best"],
        ["华语口碑剧集", "tv_chinese_best_weekly"],
        ["全球口碑剧集", "tv_global_best_weekly"],
        ["国内口碑综艺", "show_chinese_best_weekly"],
        ["国外口碑综艺", "show_global_best_weekly"]
      ]) }
    ],
    movie: [
      { key: "类型", name: "类型", value: kv(["", "喜剧", "爱情", "动作", "科幻", "动画", "悬疑", "犯罪", "惊悚", "冒险", "奇幻", "恐怖", "战争", "历史", "传记", "武侠", "歌舞", "灾难", "纪录片"]) },
      { key: "地区", name: "地区", value: kv(["", "华语", "中国大陆", "中国香港", "中国台湾", "欧美", "美国", "英国", "韩国", "日本", "法国", "德国", "印度", "泰国"]) },
      { key: "年代", name: "年代", value: yearValues },
      { key: "sort", name: "排序", value: kv([["近期热度", "U"], ["首映时间", "R"], ["高分优先", "S"], ["综合排序", "T"]]) }
    ],
    tv: [
      { key: "形式", name: "形式", value: kv([["电视剧", "电视剧"], ["综艺", "综艺"]]) },
      { key: "类型", name: "类型", value: kv(["", "喜剧", "爱情", "悬疑", "动画", "武侠", "古装", "家庭", "犯罪", "科幻", "恐怖", "历史", "战争", "动作", "冒险", "传记", "剧情", "奇幻", "惊悚", "纪录片", "真人秀", "脱口秀", "音乐", "美食", "旅行"]) },
      { key: "地区", name: "地区", value: kv(["", "华语", "中国大陆", "中国香港", "中国台湾", "欧美", "美国", "英国", "韩国", "日本"]) },
      { key: "年代", name: "年代", value: yearValues },
      { key: "sort", name: "排序", value: kv([["近期热度", "U"], ["首播时间", "R"], ["高分优先", "S"], ["综合排序", "T"]]) }
    ]
  },
  推荐: "js:" + LIB + HOME,
  一级: "js:" + LIB + CATE,
  二级: "",
  搜索: ""
};
