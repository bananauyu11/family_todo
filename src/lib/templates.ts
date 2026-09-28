import type { CategoryId, Priority } from "./types";

// 担当の "A" は1人目のメンバー（既定: 妻）、"B" は2人目（既定: 夫）、"both" はふたり。
export type Template = {
  title: string;
  note: string;
  category: CategoryId;
  who: "A" | "B" | "both";
  priority: Priority;
};

export const TEMPLATES: Template[] = [
  // 健康・検査
  {
    title: "婦人科でブライダルチェック（妊活前検診）を受ける",
    note: "性感染症・子宮や卵巣の状態・ホルモン値などを確認。生理周期に合わせて予約。",
    category: "health",
    who: "A",
    priority: "high",
  },
  {
    title: "風疹の抗体検査を受ける",
    note: "抗体が不十分ならワクチン接種。女性は接種後2か月は避妊が必要。自治体の無料検査・助成を確認。",
    category: "health",
    who: "both",
    priority: "high",
  },
  {
    title: "男性のブライダルチェック・精液検査を検討する",
    note: "泌尿器科や不妊クリニックで受けられる。自宅用キットもある。",
    category: "health",
    who: "B",
    priority: "normal",
  },
  {
    title: "子宮頸がん検診を受ける",
    note: "直近1〜2年で受けていなければ受診。",
    category: "health",
    who: "A",
    priority: "normal",
  },
  {
    title: "歯科検診を受け、虫歯・歯周病の治療を済ませる",
    note: "妊娠中は治療の選択肢が限られるため、先に済ませておく。",
    category: "health",
    who: "both",
    priority: "normal",
  },
  {
    title: "持病・常用薬について主治医に妊娠希望を伝えて相談する",
    note: "薬の変更や調整が必要な場合がある。",
    category: "health",
    who: "both",
    priority: "normal",
  },
  {
    title: "予防接種歴（麻しん・水痘・おたふく等）を確認する",
    note: "母子手帳などで確認。不明なら抗体検査も検討。",
    category: "health",
    who: "both",
    priority: "low",
  },

  // 体づくり・生活習慣
  {
    title: "葉酸サプリを飲み始める",
    note: "妊娠の1か月以上前から、食事に加えてサプリで1日400μgが目安（厚生労働省）。",
    category: "body",
    who: "A",
    priority: "high",
  },
  {
    title: "基礎体温・生理周期の記録を始める",
    note: "アプリでもOK。受診時にも役立つ。",
    category: "body",
    who: "A",
    priority: "normal",
  },
  {
    title: "禁煙する（受動喫煙も避ける）",
    note: "男女ともに妊娠しやすさや胎児への影響がある。",
    category: "body",
    who: "both",
    priority: "high",
  },
  {
    title: "お酒の量を見直す",
    note: "妊娠がわかる前から控えるのが安心。",
    category: "body",
    who: "both",
    priority: "normal",
  },
  {
    title: "適正体重を目指す（BMI 18.5〜25 程度）",
    note: "やせすぎ・太りすぎはどちらも妊娠や出産に影響しやすい。",
    category: "body",
    who: "both",
    priority: "normal",
  },
  {
    title: "運動・睡眠の習慣を整える",
    note: "ウォーキングなど続けやすいものから。",
    category: "body",
    who: "both",
    priority: "low",
  },
  {
    title: "精巣を温めすぎない習慣を意識する",
    note: "長風呂・サウナ・膝上のノートPCなどを控えめに。",
    category: "body",
    who: "B",
    priority: "low",
  },

  // お金・制度
  {
    title: "出産までにかかる費用の目安を調べ、貯金計画を立てる",
    note: "妊婦健診・出産費用・ベビー用品など。",
    category: "money",
    who: "both",
    priority: "normal",
  },
  {
    title: "医療保険・生命保険の内容を確認する",
    note: "妊娠後は加入に条件がつくことがあるため、見直すなら妊娠前に。",
    category: "money",
    who: "both",
    priority: "normal",
  },
  {
    title: "出産育児一時金・出産手当金・育休給付の仕組みを調べる",
    note: "",
    category: "money",
    who: "both",
    priority: "low",
  },
  {
    title: "不妊治療の保険適用・自治体の助成制度を調べる",
    note: "年齢・回数の条件や、先進医療への助成の有無など。",
    category: "money",
    who: "both",
    priority: "low",
  },
  {
    title: "住んでいる自治体の妊活・子育て支援を調べる",
    note: "検査費用助成、プレコンセプションケア相談窓口など。",
    category: "money",
    who: "both",
    priority: "low",
  },

  // 仕事・職場
  {
    title: "職場の産休・育休・時短制度を確認する",
    note: "就業規則や人事に確認。",
    category: "work",
    who: "A",
    priority: "normal",
  },
  {
    title: "育休（産後パパ育休含む）の制度と取り方を確認する",
    note: "",
    category: "work",
    who: "B",
    priority: "normal",
  },
  {
    title: "通院と仕事の両立方法を考える",
    note: "有給・通院休暇・リモートワークなど使える制度を整理。",
    category: "work",
    who: "both",
    priority: "low",
  },

  // 暮らし・話し合い
  {
    title: "子どもを持つ時期や人数について話し合う",
    note: "治療を始める目安の時期なども含めて。",
    category: "life",
    who: "both",
    priority: "high",
  },
  {
    title: "通いやすい産婦人科・不妊クリニックの候補を調べる",
    note: "",
    category: "life",
    who: "both",
    priority: "normal",
  },
  {
    title: "家事分担を見直す",
    note: "",
    category: "life",
    who: "both",
    priority: "low",
  },
  {
    title: "住まい（広さ・保育園事情など）を検討する",
    note: "",
    category: "life",
    who: "both",
    priority: "low",
  },
];
