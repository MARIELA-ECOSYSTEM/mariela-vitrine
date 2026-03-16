import { useNavigate } from "react-router-dom";
import bannerLooks from "@/assets/banner-looks.jpg";

export const HeroBannerCarousel = () => {
  const navigate = useNavigate();

  return (
    <section
      className="relative w-full h-[25vh] sm:h-[34vh] md:h-[42vh] lg:h-[48vh] overflow-hidden cursor-pointer"
      onClick={() => navigate("/monte-seu-look")}
    >
      <img
        src={bannerLooks}
        alt="Monte Seu Look"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
    </section>
  );
};
