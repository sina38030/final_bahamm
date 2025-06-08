import React from "react";
import Found from "@/../public/images/404.png";
import Image from "next/image";
function notFound() {
  return (
    <div>

      <div className="flex flex-col justify-center items-center my-32">
        <Image src={Found} alt="not-found" className="lg:w-[490px] lg:h-[248px] object-fill " />
        <p className="text-[#595959] text-3xl font-bold">صفحه یافت نشد!</p>
      </div>






    </div>
  );
}

export default notFound;
