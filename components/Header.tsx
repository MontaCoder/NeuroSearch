import Image from "next/image";

const Header = () => {
  return (
    <header className="container mx-auto px-4 py-4 lg:px-8 lg:py-6">
      <div className="flex h-16 items-center justify-center lg:h-20">
        <a
          href="/"
          className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-background-secondary focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2"
          aria-label="NeuroSearch - Go to homepage"
        >
          <Image
            unoptimized
            src="/img/logo.svg"
            alt=""
            width={56}
            height={55}
            className="h-12 w-12 transition-transform duration-200 group-hover:scale-105 lg:h-14 lg:w-14"
            aria-hidden="true"
          />
          <span className="text-xl font-semibold text-text-primary lg:text-2xl">
            NeuroSearch
          </span>
        </a>
      </div>
    </header>
  );
};

export default Header;
