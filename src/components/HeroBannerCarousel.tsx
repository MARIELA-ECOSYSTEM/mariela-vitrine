import { useNavigate } from "react-router-dom";
import bannerLooks from "@/assets/banner-looks.jpg";
import logoSimple from "@/assets/logo-simple.png";

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
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

      {/* Logo watermark */}
      <img
        src={logoSimple}
        alt=""
        className="absolute top-4 right-4 h-10 sm:h-14 md:h-16 opacity-40 pointer-events-none"
      />

      {/* Text overlay */}
      <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8">
        <span className="font-serif text-white text-xl sm:text-2xl md:text-3xl font-bold drop-shadow-lg">
          Monte Seu Look
        </span>
        <p className="text-white/80 text-xs sm:text-sm mt-1 drop-shadow">
          Mariela Moda Feminina
        </p>
      </div>
    </section>
  );
};
