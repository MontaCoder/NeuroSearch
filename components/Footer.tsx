import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="border-t border-border-light bg-background-primary mt-16">
      <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div className="flex flex-col gap-4">
            <a
              href="/"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 hover:bg-background-secondary focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2 w-fit"
              aria-label="NeuroSearch - Go to homepage"
            >
              <Image
                unoptimized
                src="/img/logo.svg"
                alt=""
                width={40}
                height={39}
                className="transition-transform duration-200 group-hover:scale-105"
                aria-hidden="true"
              />
              <span className="text-lg font-semibold text-text-primary lg:text-xl">
                NeuroSearch
              </span>
            </a>
            <p className="text-sm text-text-secondary max-w-xs">
              Experience the future of AI-powered search. Fast, intelligent, and reliable results for all your queries.
            </p>
          </div>

          {/* Links Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Resources</h3>
            <nav className="flex flex-col gap-2">
              <Link
                href="/about"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                About
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                Terms of Service
              </Link>
            </nav>
          </div>

          {/* Social Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Connect</h3>
            <nav className="flex items-center gap-3" aria-label="Social links">
              <Link
                href="https://x.com/MontaCoder"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary text-text-secondary hover:bg-background-tertiary hover:text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2"
                aria-label="Follow on Twitter - Opens in new tab"
              >
                <Image
                  unoptimized
                  src="/img/x.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="opacity-60 group-hover:opacity-100 transition-opacity duration-200"
                  aria-hidden="true"
                />
              </Link>

              <Link
                href="https://github.com/MontaCoder/NeuroSearch"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-10 w-10 items-center justify-center rounded-lg bg-background-secondary text-text-secondary hover:bg-background-tertiary hover:text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-interactive-focus focus:ring-offset-2"
                aria-label="View source code on GitHub - Opens in new tab"
              >
                <Image
                  unoptimized
                  src="/img/github-footer.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="opacity-60 group-hover:opacity-100 transition-opacity duration-200"
                  aria-hidden="true"
                />
              </Link>
            </nav>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="pt-6 border-t border-border-light flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-secondary">
            © 2025 NeuroSearch. All rights reserved.
          </p>
          <p className="text-xs text-text-tertiary">
            Built with ❤️ By Montassar Hajri
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
