import React from "react";
import type { Metadata } from "next";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import BarChartOne from "@/components/charts/bar/BarChartOne";
import LineChartOne from "@/components/charts/line/LineChartOne";

export const metadata: Metadata = {
  title: "Charts — Enterprise Architecture AI",
};

export default function ChartsPage() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Charts" />

      <ComponentCard
        title="Bar Chart"
        desc="Monthly sales distribution across the year."
      >
        <BarChartOne />
      </ComponentCard>

      <ComponentCard
        title="Line / Area Chart"
        desc="Sales vs. revenue trends — dual-series area chart."
      >
        <LineChartOne />
      </ComponentCard>
    </div>
  );
}
