"use client";
import React from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useTheme } from "@/context/ThemeContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function BarChartOne() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const labelColor = isDark ? "rgba(255,255,255,0.35)" : "#6B7280";
  const gridColor  = isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0";

  const options: ApexOptions = {
    colors: [isDark ? "#28b8d5" : "#0F172A"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: { show: false },
      background: "transparent",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ["transparent"] },
    xaxis: {
      categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: labelColor, fontSize: "12px", fontFamily: "Outfit, sans-serif" } },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
      labels: { colors: labelColor },
    },
    yaxis: {
      title: { text: undefined },
      labels: { style: { colors: labelColor, fontSize: "12px" } },
    },
    grid: {
      borderColor: gridColor,
      yaxis: { lines: { show: true } },
    },
    fill: { opacity: 1 },
    tooltip: {
      x: { show: false },
      y: { formatter: (val: number) => `${val}` },
      theme: isDark ? "dark" : "light",
    },
  };

  const series = [
    {
      name: "Sales",
      data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112],
    },
  ];

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="chartOne" className="min-w-[1000px]">
        <ReactApexChart options={options} series={series} type="bar" height={180} />
      </div>
    </div>
  );
}
