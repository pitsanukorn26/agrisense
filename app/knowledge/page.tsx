"use client";

import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { useLanguage } from "@/components/language-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";

/** =========================
 *  ประเภทเทมเพลตเนื้อหา (6 รายการ)
 *  ========================= */
type TemplateKey =
  | "rice-leaf-disease"          // รูป 1: ป้องกันโรคใบพืชในข้าว
  | "sugarcane-leaf-disease"     // รูป 2: ป้องกันโรคใบพืชในอ้อย
  | "durian-leaf-disease"        // รูป 3: ป้องกันโรคใบพืชในทุเรียน
  | "rice-bph"                   // รูป 4: เพลี้ยกระโดดสีน้ำตาลในข้าว
  | "sugarcane-stem-borer"       // รูป 5: หนอนเจาะลำต้นในอ้อย
  | "durian-thrips"              // รูป 6: เพลี้ยไฟในทุเรียน
  | "default";

type TipItem = {
  title: string;
  image: string;
  alt?: string;
  template?: TemplateKey;
  detail?: string[];
};

export default function PlantipsPage() {
  const { language } = useLanguage();

  /** =================================================
   *  SECTION: กริดรายการการ์ด (2 หมวด / 6 รูป)
   *  ================================================= */
  const sections: {
    key: string;
    heading: string;
    items: TipItem[];
  }[] = [
    /** -----------------------------
     *  หมวดที่ 1: Disease Prevention
     *  ----------------------------- */
    {
      key: "prevention",
      heading:
        language === "th"
          ? "การป้องกันโรคพืช"
          : "Disease Prevention",
      items: [
        /* รูป 1: ป้องกันโรคใบพืชในข้าว */
        {
          title:
            language === "th"
              ? "การป้องกันโรคใบพืชในข้าว"
              : "Leaf disease prevention in rice",
          image: "/plantips/prevent-rice.jpg",
          alt: "Rice disease prevention",
          template: "rice-leaf-disease",
        },
        /* รูป 2: ป้องกันโรคใบพืชในอ้อย */
        {
          title:
            language === "th"
              ? "การป้องกันโรคใบพืชในอ้อย"
              : "Leaf disease prevention in sugarcane",
          image: "/plantips/prevent-sugarcane.jpg",
          alt: "Sugarcane disease prevention",
          template: "sugarcane-leaf-disease",
        },
        /* รูป 3: ป้องกันโรคใบพืชในทุเรียน */
        {
          title:
            language === "th"
              ? "การป้องกันโรคใบพืชในต้นทุเรียน"
              : "Leaf disease prevention in durian",
          image: "/plantips/prevent-durian.jpg",
          alt: "Durian disease prevention",
          template: "durian-leaf-disease",
        },
      ],
    },

    /** -----------------------------
     *  หมวดที่ 2: Pest Management
     *  ----------------------------- */
    {
      key: "pest",
      heading: language === "th" ? "การจัดการศัตรูพืช" : "Pest Management",
      items: [
        /* รูป 4: เพลี้ยกระโดดสีน้ำตาลในข้าว */
        {
          title:
            language === "th"
              ? "การจัดการเพลี้ยกระโดดสีน้ำตาลในข้าว"
              : "Brown planthopper management in rice",
          image: "/plantips/pest-rice-bph.jpg",
          alt: "Brown planthopper in rice",
          template: "rice-bph",
        },
        /* รูป 5: หนอนเจาะลำต้นในอ้อย */
        {
          title:
            language === "th"
              ? "การควบคุมหนอนเจาะลำต้นในอ้อย"
              : "Stem borer control in sugarcane",
          image: "/plantips/pest-sugarcane-borer.jpg",
          alt: "Sugarcane stem borer",
          template: "sugarcane-stem-borer",
        },
        /* รูป 6: เพลี้ยไฟในทุเรียน */
        {
          title:
            language === "th"
              ? "การป้องกันเพลี้ยไฟในต้นทุเรียน"
              : "Thrips prevention in durian",
          image: "/plantips/pest-durian-thrips.jpg",
          alt: "Thrips in durian",
          template: "durian-thrips",
        },
      ],
    },
  ];

  /** =========================
   *  state เปิด/ปิด Modal
   *  ========================= */
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<TipItem | null>(null);

  const onOpen = (item: TipItem) => {
    setActive(item);
    setOpen(true);
  };

  /** ==================================================================
   *  ฟังก์ชันแสดงเนื้อหา Template ด้านขวาของ Modal (เหมือนภาพตัวอย่าง)
   *  ================================================================== */
  const renderTemplate = (key: TemplateKey | undefined) => {
    const th = language === "th";

    switch (key) {
      /** ------------------------------------------
       *  TEMPLATE: รูป 1 การป้องกันโรคใบพืชในข้าว
       *  ------------------------------------------ */
      case "rice-leaf-disease":
        return (
          <div className="prose prose-sm max-w-none text-gray-800">
            <p className="mb-3">
              {th
                ? "การป้องกันโรคพืชในข้าวเป็นสิ่งสำคัญต่อผลผลิตและคุณภาพเมล็ดข้าว ช่วยลดความเสี่ยงขาดทุนและใช้สารเคมีอย่างจำเป็นเท่านั้น"
                : "Preventing leaf diseases in rice is crucial for yield and grain quality, reducing losses and minimizing chemical use."}
            </p>

            <h3 className="text-base font-semibold text-gray-900">
              {th ? "ประเภทโรคสำคัญ" : "Major diseases"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <span className="font-semibold">
                    {th ? "โรคไหม้ข้าว (Rice Blast)" : "Rice Blast"}
                  </span>
                  <ul className="list-disc pl-5 mt-1">
                    <li>
                      {th ? "เชื้อรา " : "Fungus "}
                      <em>Pyricularia oryzae</em>
                    </li>
                    <li>
                      {th
                        ? "ใบมีแผลรูปไข่สีน้ำตาลซีด ลุกลามสู่ลำต้น/รวง"
                        : "Elliptical lesions on leaves; spreads to stem/panicle."}
                    </li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold">
                    {th ? "โรคใบจุดสีน้ำตาล (Brown Spot)" : "Brown Spot"}
                  </span>
                  <ul className="list-disc pl-5 mt-1">
                    <li>
                      {th ? "เชื้อรา " : "Fungus "}
                      <em>Bipolaris oryzae</em>
                    </li>
                    <li>
                      {th
                        ? "ใบเกิดจุดกระจาย โดยเฉพาะช่วงออกรวง"
                        : "Scattered brown lesions, esp. at heading stage."}
                    </li>
                  </ul>
                </li>
              </ol>
              <ol start={3} className="list-decimal pl-5 space-y-2">
                <li>
                  <span className="font-semibold">
                    {th
                      ? "ใบไหม้แบคทีเรีย (Bacterial Leaf Blight)"
                      : "Bacterial Leaf Blight"}
                  </span>
                  <ul className="list-disc pl-5 mt-1">
                    <li>
                      {th ? "แบคทีเรีย " : "Bacterium "}
                      <em>Xanthomonas oryzae</em>
                    </li>
                    <li>
                      {th
                        ? "ขอบใบแห้งน้ำตาล แตกแยก"
                        : "Leaf margins dry and split."}
                    </li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold">
                    {th ? "กาบใบเน่า (Sheath Blight)" : "Sheath Blight"}
                  </span>
                  <ul className="list-disc pl-5 mt-1">
                    <li>
                      {th ? "เชื้อรา " : "Fungus "}
                      <em>Rhizoctonia solani</em>
                    </li>
                    <li>
                      {th
                        ? "โคนลำต้นชื้น มีแผลสีน้ำตาลเน่า"
                        : "Water-soaked lesions at sheath; basal rot."}
                    </li>
                  </ul>
                </li>
              </ol>
            </div>

            <h3 className="mt-4 text-base font-semibold text-gray-900">
              {th ? "วิธีการป้องกัน" : "Prevention"}
            </h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                {th
                  ? "ใช้พันธุ์ต้านทานและเมล็ด/ท่อนพันธุ์สะอาด"
                  : "Resistant varieties and clean seed."}
              </li>
              <li>
                {th
                  ? "ใส่ปุ๋ยสมดุล หลีกเลี่ยงไนโตรเจนมากเกิน"
                  : "Balanced fertilization; avoid excessive nitrogen."}
              </li>
              <li>
                {th
                  ? "ควบคุมระดับน้ำ/ระยะปลูกให้ลมผ่าน ลดความชื้นค้าง"
                  : "Manage water and spacing for airflow; reduce humidity."}
              </li>
              <li>
                {th
                  ? "ใช้ชีวภัณฑ์/สารป้องกันกำจัดเชื้อราให้ถูกช่วงและหมุนเวียนกลไก"
                  : "Use bio-agents/fungicides with proper timing and MoA rotation."}
              </li>
              <li>
                {th
                  ? "สำรวจแปลงสม่ำเสมอและจัดการเฉพาะจุด"
                  : "Scout regularly; spot treat early infections."}
              </li>
            </ol>
          </div>
        );

      /** ------------------------------------------
       *  TEMPLATE: รูป 2 การป้องกันโรคใบพืชในอ้อย
       *  ------------------------------------------ */
case "sugarcane-leaf-disease":
  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <p className="mb-3">
        {th
          ? "การป้องกันโรคใบพืชในอ้อยเป็นสิ่งสำคัญ เพราะช่วยลดความเสียหายต่อผลผลิต รักษาคุณภาพอ้อย และลดการใช้สารเคมี เกษตรกรควรเลือกพันธุ์ต้านทาน ดูแลแปลงอย่างถูกวิธี และตรวจแปลงสม่ำเสมอเพื่อจัดการโรคได้ทันเวลา"
          : "Preventing leaf diseases in sugarcane is important to reduce yield loss, maintain quality, and minimize chemical use. Farmers should choose resistant varieties, manage fields properly, and regularly monitor crops to control outbreaks early."}
      </p>

      <h3 className="text-base font-semibold text-gray-900">
        {th ? "ประเภทโรคสำคัญ" : "Major Diseases"}
      </h3>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          {th
            ? "โรคใบขาวอ้อย (Sugarcane White Leaf Disease) – เกิดจากไฟโตพลาสมา (Phytoplasma) อาการ: ใบอ้อยซีดขาวเป็นแถบ ใบแคบ แคระแกร็น"
            : "Sugarcane White Leaf Disease – caused by Phytoplasma. Symptoms: pale white streaks on leaves, narrow leaves, stunted growth."}
        </li>
        <li>
          {th
            ? "โรคใบขีดสีน้ำตาล (Brown Stripe/Leaf Scald) – เกิดจากแบคทีเรีย Xanthomonas albilineans อาการ: ใบมีเส้นขีดน้ำตาลยาวตามใบ แห้งเหี่ยว ต้นโทรมเร็ว"
            : "Brown Stripe/Leaf Scald – caused by Xanthomonas albilineans. Symptoms: long brown streaks on leaves, wilting, rapid decline."}
        </li>
        <li>
          {th
            ? "โรคใบจุดวงแหวน (Ring Spot / Leaf Spot) – เกิดจากเชื้อรา Cercospora spp. อาการ: ใบมีจุดวงแหวนสีน้ำตาล ขอบเข้ม เนื้อกลางซีด"
            : "Ring Spot / Leaf Spot – caused by Cercospora spp. Symptoms: brown ring spots on leaves, dark margins, pale centers."}
        </li>
      </ul>

      <h3 className="text-base font-semibold text-gray-900 mt-4">
        {th ? "วิธีการป้องกัน" : "Prevention Methods"}
      </h3>
      <ol className="list-decimal pl-5 space-y-2">
        <li>
          {th
            ? "ใช้พันธุ์อ้อยที่ต้านทานโรค และเลือกท่อนพันธุ์จากแปลงที่ปลอดโรค"
            : "Use resistant sugarcane varieties and select setts from disease-free fields."}
        </li>
        <li>
          {th
            ? "ทำความสะอาดแปลง กำจัดวัชพืช และเผาทำลายเศษซากที่มีเชื้อสะสม"
            : "Maintain field hygiene, remove weeds, and destroy infected residues."}
        </li>
        <li>
          {th
            ? "ใช้ชีวภัณฑ์หรือสารเคมีป้องกันกำจัดเชื้อรา/แบคทีเรียอย่างเหมาะสม"
            : "Apply biocontrol agents or chemical treatments appropriately."}
        </li>
        <li>
          {th
            ? "ดูแลการใส่ปุ๋ยและน้ำให้สมดุล เพื่อลดความเครียดของต้นอ้อย"
            : "Ensure balanced fertilization and water management to reduce plant stress."}
        </li>
        <li>
          {th
            ? "ตรวจแปลงอ้อยอย่างสม่ำเสมอ และจัดการเฉพาะจุดเมื่อพบการระบาด"
            : "Regularly inspect fields and manage outbreaks locally when detected."}
        </li>
      </ol>
    </div>
  );

      /** ------------------------------------------
       *  TEMPLATE: รูป 3 การป้องกันโรคใบพืชในทุเรียน
       *  ------------------------------------------ */
case "durian-leaf-disease":
  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <p className="mb-3">
        {th
          ? "ทุเรียนเป็นพืชเศรษฐกิจสำคัญของไทยที่ต้องอาศัยการดูแลอย่างใกล้ชิด โดยเฉพาะ “โรคใบ” ซึ่งส่งผลโดยตรงต่อการสังเคราะห์แสงและการเจริญเติบโต หากเกิดความเสียหายที่ใบจะทำให้ต้นอ่อนแอ ผลผลิตลดลง คุณภาพผลด้อยลง และบางครั้งอาจทำให้ต้นยืนต้นตาย การป้องกันโรคใบจึงเป็นหัวใจสำคัญในการดูแลสวนทุเรียนให้ให้ผลผลิตได้อย่างต่อเนื่องและยั่งยืน"
          : "Durian is an important economic crop in Thailand that requires close care, especially against leaf diseases, which directly affect photosynthesis and growth. Leaf damage weakens trees, reduces yield and fruit quality, and in severe cases may cause tree death. Preventing leaf diseases is therefore essential for sustainable durian production."}
      </p>

      <h3 className="text-base font-semibold text-gray-900">
        {th ? "ประเภทโรคสำคัญ" : "Major Diseases"}
      </h3>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          {th
            ? "โรคใบติด (Leaf Blight / Leaf Fall) – เชื้อรา Phytophthora palmivora. อาการ: ใบมีจุดสีน้ำตาลเข้ม เน่าแห้ง และร่วงหล่นง่าย"
            : "Leaf Blight / Leaf Fall – caused by Phytophthora palmivora. Symptoms: dark brown lesions, leaf necrosis, premature leaf drop."}
        </li>
        <li>
          {th
            ? "โรครากเน่าโคนเน่า (Root & Stem Rot) – เชื้อรา Phytophthora palmivora. อาการ: ใบร่วงเหลือง กิ่งแห้ง ต้นทรุดโทรม"
            : "Root & Stem Rot – caused by Phytophthora palmivora. Symptoms: yellowing leaves, branch dieback, tree decline."}
        </li>
        <li>
          {th
            ? "โรคใบจุด (Leaf Spot) – เชื้อรา Colletotrichum spp. อาการ: ใบมีจุดสีน้ำตาลหรือดำกระจาย ขอบเหลือง"
            : "Leaf Spot – caused by Colletotrichum spp. Symptoms: scattered brown/black spots on leaves with yellow margins."}
        </li>
      </ul>

      <h3 className="text-base font-semibold text-gray-900 mt-4">
        {th ? "วิธีการป้องกัน" : "Prevention Methods"}
      </h3>
      <ol className="list-decimal pl-5 space-y-2">
        <li>
          {th
            ? "เลือกพันธุ์ทุเรียนที่แข็งแรง และใช้กิ่งพันธุ์ปลอดโรค"
            : "Choose vigorous, resistant varieties and use disease-free planting materials."}
        </li>
        <li>
          {th
            ? "กำจัดใบ กิ่ง และเศษซากพืชที่เป็นโรคออกจากสวน"
            : "Remove diseased leaves, branches, and plant debris from the orchard."}
        </li>
        <li>
          {th
            ? "จัดการแปลงให้โปร่ง ระบายอากาศและน้ำได้ดี ลดความชื้นสะสม"
            : "Maintain open canopy with good air circulation and drainage to reduce humidity."}
        </li>
        <li>
          {th
            ? "บำรุงต้นด้วยปุ๋ยและน้ำที่สมดุล เสริมธาตุอาหารรองเพื่อเพิ่มความแข็งแรง"
            : "Provide balanced fertilizer and water, plus micronutrients to strengthen plants."}
        </li>
        <li>
          {th
            ? "ใช้ชีวภัณฑ์ (เช่น ไตรโคเดอร์มา) หรือสารป้องกันกำจัดเชื้อราในช่วงเสี่ยง"
            : "Apply biocontrol agents (e.g., Trichoderma) or fungicides during high-risk periods."}
        </li>
      </ol>
    </div>
  );
      /** ------------------------------------------
       *  TEMPLATE: รูป 4 เพลี้ยกระโดดสีน้ำตาลในข้าว
       *  ------------------------------------------ */
      case "rice-bph":
        return (
          <div className="prose prose-sm max-w-none text-gray-800">
            <p className="mb-3">
              {th
                ? "เพลี้ยกระโดดสีน้ำตาลทำให้ข้าวแห้งตายเป็นหย่อม (hopperburn) แนวทางคือ IPM เน้นเฝ้าระวังและใช้สารอย่างจำเพาะเมื่อถึงระดับเศรษฐกิจ"
                : "Brown planthopper causes hopperburn; IPM emphasizes monitoring and targeted sprays only beyond economic thresholds."}
            </p>
            <h3 className="text-base font-semibold text-gray-900">
              {th ? "แนวทางจัดการ" : "Management"}
            </h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                {th
                  ? "หลีกเลี่ยงใส่ไนโตรเจนเกิน ช่วยลดการระบาด"
                  : "Avoid excessive nitrogen to reduce outbreaks."}
              </li>
              <li>
                {th
                  ? "อนุรักษ์ตัวห้ำ-ตัวเบียน และใช้กับดักไฟ/กาวติดตามประชากร"
                  : "Conserve natural enemies; use light/sticky traps for monitoring."}
              </li>
              <li>
                {th
                  ? "สำรวจนับตัวต่อรวง/กอ หากถึงเกณฑ์จึงพ่นสารเฉพาะกลุ่ม"
                  : "Scout tiller/panicle counts; spray specific MoA only at threshold."}
              </li>
              <li>
                {th
                  ? "ใช้สารสลับกลไกเพื่อลดดื้อยา และพ่นแบบเจาะจงบริเวณระบาด"
                  : "Rotate MoA to prevent resistance; spot-spray infested patches."}
              </li>
              <li>
                {th
                  ? "จัดการน้ำให้เหมาะ ลดความหนาแน่นกอมากเกิน"
                  : "Manage water and avoid overly dense stands."}
              </li>
            </ol>
          </div>
        );

      /** ------------------------------------------
       *  TEMPLATE: รูป 5 หนอนเจาะลำต้นในอ้อย
       *  ------------------------------------------ */
      case "sugarcane-stem-borer":
        return (
          <div className="prose prose-sm max-w-none text-gray-800">
            <p className="mb-3">
              {th
                ? "หนอนเจาะลำต้นทำให้ลำอ้อยหักโค่น/ตายแห้ง ลดน้ำตาล แนวทางเน้นสุขอนามัยแปลงและชีววิธีร่วมกับสารอย่างจำเป็น"
                : "Stem borer causes deadhearts and lodging, reducing sugar; management combines sanitation and biological control with selective chemicals."}
            </p>
            <h3 className="text-base font-semibold text-gray-900">
              {th ? "แนวทางจัดการ" : "Management"}
            </h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                {th
                  ? "ใช้ท่อนพันธุ์สะอาด ปลูกตามช่วงเวลาที่เหมาะสม"
                  : "Use clean setts; plant at recommended window."}
              </li>
              <li>
                {th
                  ? "เก็บซัง/ท่อนอ้อยที่ถูกทำลายออกไปเผาทำลายนอกแปลง"
                  : "Remove and destroy infested stalks off-field."}
              </li>
              <li>
                {th
                  ? "ปล่อยแตนเบียน/เชื้อจุลินทรีย์ควบคุมระยะไข่-ตัวหนอน"
                  : "Release parasitoids / entomopathogens against eggs/larvae."}
              </li>
              <li>
                {th
                  ? "พ่นสารเฉพาะจุดเมื่อพบระบาดช่วงต้น และสลับกลไก"
                  : "Spot-apply insecticides early and rotate MoA."}
              </li>
              <li>
                {th
                  ? "กำจัดวัชพืชแนวคัน/ขอบแปลงซึ่งเป็นแหล่งอาศัย"
                  : "Weed borders that harbor borers."}
              </li>
            </ol>
          </div>
        );

      /** ------------------------------------------
       *  TEMPLATE: รูป 6 เพลี้ยไฟในทุเรียน
       *  ------------------------------------------ */
      case "durian-thrips":
        return (
          <div className="prose prose-sm max-w-none text-gray-800">
            <p className="mb-3">
              {th
                ? "เพลี้ยไฟทำลายใบอ่อน/ผลอ่อน เกิดรอยสนิม ผิวผลเสียหาย คุมด้วยสภาพแวดล้อมที่เหมาะสมและการพ่นแบบสลับกลไก"
                : "Thrips damage young leaves/fruits causing scarring; manage microclimate and rotate insecticide MoA."}
            </p>
            <h3 className="text-base font-semibold text-gray-900">
              {th ? "แนวทางป้องกัน/ควบคุม" : "Prevention/Control"}
            </h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                {th
                  ? "รักษาความชื้นเหมาะสม ลดสภาพแห้งแล้งจัดโดยให้น้ำสม่ำเสมอ"
                  : "Maintain adequate humidity; avoid drought stress."}
              </li>
              <li>
                {th
                  ? "ตัดแต่งกิ่ง/ผลที่เสียหาย และเก็บกวาดออกจากสวน"
                  : "Prune damaged shoots/fruits and remove from orchard."}
              </li>
              <li>
                {th
                  ? "ใช้แผ่นกาวเหนียวสีฟ้า/เหลืองและผ้าคลุมเพื่อกดประชากร"
                  : "Use blue/yellow sticky traps and protective covers."}
              </li>
              <li>
                {th
                  ? "พ่นสารเฉพาะกลุ่มสลับกลไก (เช่น spinosyns, abamectin ฯลฯ) ตามคำแนะนำท้องถิ่น"
                  : "Rotate MoA (e.g., spinosyns, abamectin, etc.) per local guidance."}
              </li>
              <li>
                {th
                  ? "หลีกเลี่ยงพ่นซ้ำกลุ่มเดิมถี่ ๆ ลดโอกาสการดื้อยา"
                  : "Avoid frequent re-use of same MoA to prevent resistance."}
              </li>
            </ol>
          </div>
        );

      /** ---------------------
       *  DEFAULT FALLBACK
       *  --------------------- */
      default:
        return (
          <p className="text-gray-800">
            {th
              ? "ยังไม่มีรายละเอียดเพิ่มเติมสำหรับรายการนี้"
              : "No additional details for this item yet."}
          </p>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Navigation />

      <main className="container mx-auto px-4 md:px-6 lg:px-10 py-10">
        {/* =========================
            วนแสดงการ์ดแต่ละหมวด
           ========================= */}
        <div className="space-y-14">
          {sections.map((section) => (
            <section key={section.key} className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌾</span>
                <h2 className="text-[20px] font-semibold text-gray-900">
                  {section.heading}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
                {section.items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => onOpen(item)}
                    className="group text-left cursor-pointer"
                    aria-label={item.title}
                  >
                    <figure>
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5 bg-gray-100">
                        <img
                          src={item.image}
                          alt={item.alt ?? item.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                      <figcaption className="mt-3 text-center text-[15px] text-gray-800">
                        {item.title}
                      </figcaption>
                    </figure>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* =========================
          Modal รายละเอียด
         ========================= */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-x-hidden overflow-y-auto p-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="text-lg font-semibold">
              {active?.title}
            </DialogTitle>
          </DialogHeader>

          {/* Body 2 คอลัมน์: ซ้ายรูป/ปุ่ม, ขวาเนื้อหา */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* ซ้าย (ภาพ 2 ช่อง + ปุ่มย้อนกลับ) */}
              <div className="md:col-span-2 space-y-4">
                {/* รูปหลัก */}
                <div className="aspect-[4/3] w-full overflow-hidden rounded-md ring-1 ring-black/10 bg-gray-100">
                  <img
                    src={active?.image ?? ""}
                    alt={active?.alt ?? active?.title ?? ""}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* รูปอินโฟ */}
                <div className="aspect-[4/3] w-full overflow-hidden rounded-md ring-1 ring-black/10 bg-gray-100">
                  <img
                    src={
                      active?.template === "rice-leaf-disease"
                        ? "/plantips/rice-disease-infographic.jpg"
                        : active?.template === "sugarcane-leaf-disease"
                        ? "/plantips/sugarcane-leaf-infographic.jpg"
                        : active?.template === "durian-leaf-disease"
                        ? "/plantips/durian-leaf-infographic.jpg"
                        : active?.template === "rice-bph"
                        ? "/plantips/rice-bph-infographic.jpg"
                        : active?.template === "sugarcane-stem-borer"
                        ? "/plantips/sugarcane-borer-infographic.jpg"
                        : active?.template === "durian-thrips"
                        ? "/plantips/durian-thrips-infographic.jpg"
                        : active?.image ?? ""
                    }
                    alt="Infographic"
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* ปุ่มย้อนกลับ */}
                <button
                  onClick={() => setOpen(false)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-green-100 text-green-900 hover:bg-green-200 transition px-4 py-3 text-base font-medium"
                >
                  <ArrowLeft className="h-5 w-5" />
                  {language === "th" ? "ย้อนกลับ" : "Back"}
                </button>
              </div>

              {/* ขวา (รายละเอียดตามเทมเพลต) */}
              <div className="md:col-span-3">
                <div className="h-1 w-40 bg-blue-500 rounded mb-3" />
                {renderTemplate(active?.template)}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
