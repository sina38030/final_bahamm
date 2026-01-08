/* محتوای ثابت هر Bottom-Sheet
   key ها با کد open('key') باید یکی باشند  */

import styles from './sheetContent.module.css';

/* کامپوننت عمومی برای همه شیت‌ها */
interface SheetContentProps {
  image: string;
  title: string;
  description: string;
  onClose?: () => void;
}

const SheetContent = ({ image, title, description }: SheetContentProps) => (
  <div className={styles.sheetContentWrap}>
    <div className={styles.imageWrap}>
      <img src={image} alt={title} className={styles.image} />
    </div>
    <h3 className={styles.title}>{title}</h3>
    <p className={styles.description}>{description}</p>
  </div>
);

export default {
  ship: (
    <SheetContent
      image="/images/sheets/shipping.svg"
      title="جزئیات ارسال"
      description="ارسال توسط پیک ویژه با دمای کنترل‌شده و بیمهٔ کامل انجام می‌شود. سفارش شما در کمترین زمان ممکن و با حفظ کیفیت به دستتان می‌رسد. هزینه ارسال برای سفارش‌های بالای ۵۰۰ هزار تومان رایگان است."
    />
  ),

  merge: (
    <SheetContent
      image="/images/sheets/merge.svg"
      title="تجمیع سفارش"
      description="می‌توانید سبد را تا ۴۸ ساعت باز نگه دارید و سفارش دوستان را اضافه کنید. با این کار هم در هزینه ارسال صرفه‌جویی می‌کنید و هم از تخفیف گروهی بهره‌مند می‌شوید."
    />
  ),

  commit: (
    <SheetContent
      image="/images/sheets/commitment.svg"
      title="تعهدات باهم"
      description="ما متعهد به تضمین کیفیت، بازگشت وجه در صورت نارضایتی و حمایت مستقیم از کشاورزان هستیم. هر محصول قبل از ارسال بررسی کیفی می‌شود."
    />
  ),

  return: (
    <SheetContent
      image="/images/sheets/return.svg"
      title="راهنمای مرجوعی"
      description="تا ۷۲ ساعت پس از تحویل می‌توانید محصول را مرجوع کنید. کافیست از طریق پشتیبانی درخواست مرجوعی ثبت کنید و پیک ما محصول را از درب منزل تحویل می‌گیرد."
    />
  ),

  headline: (
    <SheetContent
      image="/images/sheets/info.svg"
      title="دربارهٔ این محصول"
      description="اینجا می‌توانید توضیح کوتاه یا هایلایت مرتبط با پیام هدر را نمایش دهید. این محصول با بهترین کیفیت و قیمت مناسب برای شما انتخاب شده است."
    />
  ),

  friend: (
    <SheetContent
      image="/images/sheets/friend-price.svg"
      title="قیمت برای دوستانت"
      description="وقتی دوستانت را به خرید گروهی دعوت می‌کنی، آن‌ها هم می‌توانند با همین قیمت ویژه خرید کنند. هر چه تعداد دوستان بیشتر باشد، تخفیف بیشتری برای همه اعمال می‌شود!"
    />
  ),
} as const;
