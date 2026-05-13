"use client";
import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useTheme } from "@/context/ThemeContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function LineChartOne() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const labelColor = isDark ? "rgba(255,255,255,0.35)" : "#6B7280";
  const gridColor  = isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0";
  const markerStroke = isDark ? "#000000" : "#ffffff";

  const options: ApexOptions = {
    legend: {
      show: false,
      position: "top",
      horizontalAlign: "left",
    },
    colors: isDark
      ? ["#28b8d5", "rgba(40,184,213,0.45)"]
      : ["#0F172A", "#94A3B8"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: { show: false },
      background: "transparent",
    },
    stroke: {
      curve: "straight",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.45,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: markerStroke,
      strokeWidth: 2,
      hover: { size: 6 },
    },
    grid: {
      borderColor: gridColor,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      x: { format: "dd MMM yyyy" },
      theme: isDark ? "dark" : "light",
    },
    xaxis: {
      type: "category",
      categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: { style: { colors: labelColor, fontSize: "12px", fontFamily: "Outfit, sans-serif" } },
    },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: [labelColor] },
      },
      title: {
        text: "",
        style: { fontSize: "0px" },
      },
    },
  };

  const series = [
    {
      name: "Sales",
      data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
    },
    {
      name: "Revenue",
      data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
    },
  ];

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="chartEight" className="min-w-[1000px]">
        <ReactApexChart options={options} series={series} type="area" height={310} />
      </div>
    </div>
  );
}
