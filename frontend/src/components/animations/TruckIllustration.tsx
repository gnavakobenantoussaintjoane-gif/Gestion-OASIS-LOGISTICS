import { useId } from "react";
import type { ContainerKind } from "./TruckModel";
/** Lightweight detailed side elevation, also available without WebGL. */
export default function TruckIllustration({ kind }: { kind: ContainerKind }) {
  const id = useId().replaceAll(":", "");
  const steel = `${id}-steel`,
    paint = `${id}-paint`,
    glass = `${id}-glass`;
  const color =
    kind === "40_REEFER"
      ? "#e1e7ec"
      : kind === "20_DRY"
        ? "#a95932"
        : "#235f9b";
  const start = kind === "20_DRY" ? 205 : 20;
  return (
    <svg
      className="truck-illustration"
      viewBox="0 0 800 280"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={steel} x2="0" y2="1">
          <stop stopColor="#f8fafc" />
          <stop offset=".5" stopColor="#91a4b7" />
          <stop offset="1" stopColor="#d9e2eb" />
        </linearGradient>
        <linearGradient id={paint} x2=".2" y2="1">
          <stop stopColor="#fff" />
          <stop offset=".65" stopColor="#dbe4eb" />
          <stop offset="1" stopColor="#7e95aa" />
        </linearGradient>
        <linearGradient id={glass} x2="1" y2="1">
          <stop stopColor="#54849d" />
          <stop offset=".5" stopColor="#1c354c" />
          <stop offset="1" stopColor="#0a192b" />
        </linearGradient>
      </defs>
      <ellipse
        cx="400"
        cy="263"
        rx="380"
        ry="12"
        fill="#020c19"
        opacity=".45"
      />
      <path
        d="M18 211H780V232H18Z"
        fill="#182633"
        stroke="#5a7188"
        strokeWidth="3"
      />
      <path
        d={`M${start} 38H548V207H${start}Z`}
        fill={color}
        stroke="#91acc0"
        strokeWidth="3"
      />
      {Array.from({ length: kind === "20_DRY" ? 20 : 32 }, (_, i) => {
        const x =
          start + 8 + (i * (528 - start)) / (kind === "20_DRY" ? 20 : 32);
        return (
          <path
            key={i}
            d={`M${x} 43V201`}
            stroke="#071c36"
            strokeOpacity=".3"
            strokeWidth="5"
          />
        );
      })}
      <path
        d={`M${start} 40H548M${start} 202H548`}
        stroke="#e1eff8"
        strokeOpacity=".5"
        strokeWidth="4"
      />
      <text
        x={(start + 548) / 2}
        y="116"
        textAnchor="middle"
        fill={kind === "40_REEFER" ? "#163554" : "#f1f6fc"}
        fontSize="24"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
        letterSpacing="2"
      >
        OASIS LOGISTICS
      </text>
      <text
        x={(start + 548) / 2}
        y="140"
        textAnchor="middle"
        fill={kind === "40_REEFER" ? "#163554" : "#d4e4f4"}
        fontSize="10"
        letterSpacing="3"
      >
        {kind === "40_REEFER"
          ? "40 PIEDS · REEFER"
          : kind === "20_DRY"
            ? "20 PIEDS · DRY"
            : "40 PIEDS · DRY"}
      </text>
      {kind === "40_REEFER" && (
        <g>
          <rect
            x="549"
            y="66"
            width="24"
            height="125"
            rx="4"
            fill={`url(#${steel})`}
          />
          {[92, 141].map((y) => (
            <circle key={y} cx="562" cy={y} r="10" fill="#293b4c" />
          ))}
        </g>
      )}
      <path
        d="M598 207V71Q599 41 623 39H699Q714 41 724 67L752 125V217H598Z"
        fill={`url(#${paint})`}
        stroke="#c4d4e1"
        strokeWidth="2"
      />
      <path
        d="M612 77Q613 61 625 61H651V127H611ZM663 61H696Q703 61 710 78L731 123H663Z"
        fill={`url(#${glass})`}
        stroke="#7a98af"
        strokeWidth="2"
      />
      <path
        d="M616 68L642 68L616 112M670 69L696 69L723 117"
        fill="none"
        stroke="#8fb2c9"
        opacity=".4"
        strokeWidth="3"
      />
      <path
        d="M658 58V191H610V136M599 151H750M729 131L744 132"
        fill="none"
        stroke="#7c93a7"
        strokeWidth="2"
      />
      <rect x="619" y="142" width="19" height="5" rx="2" fill="#354c60" />
      <path d="M732 102H763V139" stroke="#aabfce" strokeWidth="4" fill="none" />
      <rect x="756" y="113" width="14" height="30" rx="4" fill="#203449" />
      <path d="M735 163H753V197H731Z" fill="#102237" />
      {[169, 177, 185].map((y) => (
        <path key={y} d={`M734 ${y}H751`} stroke="#9db1c5" strokeWidth="2" />
      ))}
      <rect
        x="746"
        y="199"
        width="23"
        height="10"
        rx="2"
        fill="#f2f9ff"
        stroke="#93bdd5"
      />
      <path d="M736 217H781V231H730" fill={`url(#${steel})`} />
      <rect
        x="560"
        y="209"
        width="48"
        height="22"
        rx="5"
        fill={`url(#${steel})`}
      />
      <path d="M614 183H648V208H613" fill="#263d51" />
      <path d="M616 191H643M616 201H643" stroke="#b5cadb" strokeWidth="3" />
      <text x="669" y="154" fontSize="8" fontWeight="700" fill="#193c63">
        OASIS
      </text>
      {[72, 130, 188, 581, 693].map((x, i) => (
        <g
          key={x}
          className="realistic-wheel"
          transform={`translate(${x} 233)`}
        >
          <circle r="30" fill="#0c131b" stroke="#344250" strokeWidth="3" />
          <circle r="23" fill="#151f29" stroke="#4c5d6b" />
          <circle r="17" fill={`url(#${steel})`} />
          <circle r="7" fill="#526779" />
          {Array.from({ length: 8 }, (_, j) => (
            <circle
              key={j}
              cx={12 * Math.cos((j * Math.PI) / 4)}
              cy={12 * Math.sin((j * Math.PI) / 4)}
              r="2"
              fill="#263c4e"
            />
          ))}
          <path
            d="M-24 -17Q0 -39 24 -17"
            fill="none"
            stroke="#62788a"
            strokeWidth="2"
          />
          {i < 3 && <path d="M-34 -30H34" stroke="#1b2b3c" strokeWidth="6" />}
        </g>
      ))}
      {[35, 245, 350, 460, 530].map((x) => (
        <rect
          key={x}
          x={x}
          y="215"
          width="9"
          height="4"
          rx="1"
          fill="#f1b856"
        />
      ))}
    </svg>
  );
}
