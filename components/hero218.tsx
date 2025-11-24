"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Particles } from "@/components/magicui/particles";
import { Button } from "@/components/ui/button";

const Hero218 = () => {
  return (
    <section className="py-32 flex items-center justify-center min-h-screen relative overflow-hidden">
      <div className="container flex flex-col items-center justify-center gap-4 overflow-hidden h-fit">
        <h1 className="realtive z-15 max-w-3xl text-center text-6xl font-medium tracking-tighter md:text-7xl">
          <span
            className="overflow-hidden"
            style={{
              transformStyle: "preserve-3d",
              perspective: "600px",
            }}
          >
            {"Where Digital Work Finally Makes Sense"
              .split(" ")
              .map((word, i) => (
                <motion.span
                  className="relative inline-block px-1.5 leading-[none]"
                  key={i}
                  initial={{
                    opacity: 0,
                    y: "70%",
                    rotateX: "-28deg",
                  }}
                  animate={{
                    opacity: 1,
                    y: "0%",
                    rotateX: "0deg",
                  }}
                  transition={{
                    delay: i * 0.08 + 0.1,
                    duration: 0.8,
                    ease: [0.215, 0.61, 0.355, 1],
                  }}
                >
                  {word === "Sense" ? (
                    <span className="font-playfair italic">{word}</span>
                  ) : (
                    word
                  )}
                </motion.span>
              ))}
          </span>
        </h1>
        <Particles
          className="absolute inset-0"
          quantity={500}
          ease={80}
          color="#000000"
          refresh
        />
                <p className="text-muted-foreground">
                Digital Solutions, Finally Simple. Everything from freelancers to SaaS — packaged as products you can buy in minutes.
                </p>
                <Button
          asChild
          variant="secondary"
          className="text-md group flex w-fit items-center justify-center gap-2 rounded-sm px-4 py-1 tracking-tight bg-zinc-50 hover:bg-white"
        ><Link href={"https://t.me/EmanuelaMilina"} target="_blank" rel="noreferrer">
          Contact Us now
          <ArrowRight className="size-4 -rotate-45 transition-all ease-out group-hover:ml-3 group-hover:rotate-0" />
          </Link>
        </Button>
       
        
        
        
      </div>
    </section>
  );
};

export { Hero218 };
