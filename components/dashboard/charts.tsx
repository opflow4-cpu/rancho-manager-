"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, PieChart as PieChartIcon, CalendarRange } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  Ativa: "#22c55e",
  Aquecendo: "#f59e0b",
  Restrita: "#fb923c",
  Bloqueada: "#ef4444",
  Caiu: "#7f1d1d",
  Pausada: "#6b7280",
};

const tooltipStyle = {
  backgroundColor: "hsl(22 18% 9%)",
  border: "1px solid hsl(28 16% 22%)",
  borderRadius: 10,
  color: "hsl(42 24% 92%)",
  fontSize: 12,
  boxShadow: "0 12px 32px -12px rgba(0,0,0,0.7)",
};

function ChartHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <CardHeader className="flex-row items-center gap-2 space-y-0">
      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <CardTitle className="text-[0.75rem]">{title}</CardTitle>
    </CardHeader>
  );
}

export function RevenueByOperatorChart({
  data,
}: {
  data: { name: string; total: number }[];
}) {
  return (
    <Card>
      <ChartHeader icon={TrendingUp} title="Faturamento por operador" />
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8 }}>
            <defs>
              <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--gold-soft))" />
                <stop offset="100%" stopColor="hsl(var(--ember))" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(28 16% 20%)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="hsl(32 10% 63%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(32 10% 63%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCurrency(v).replace("R$", "").trim()}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--gold) / 0.06)" }}
              contentStyle={tooltipStyle}
              formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
            />
            <Bar dataKey="total" fill="url(#barGold)" radius={[6, 6, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function AccountsByStatusChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <Card>
      <ChartHeader icon={PieChartIcon} title="Contas por status" />
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip contentStyle={tooltipStyle} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              stroke="hsl(22 16% 8%)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#8a8a8a"} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[entry.name] ?? "#8a8a8a" }}
              />
              {entry.name} ({entry.value})
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PostsThisWeekChart({
  data,
}: {
  data: { name: string; posts: number }[];
}) {
  return (
    <Card>
      <ChartHeader icon={CalendarRange} title="Posts desta semana por operador" />
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8 }}>
            <defs>
              <linearGradient id="barEmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--ember-soft))" />
                <stop offset="100%" stopColor="hsl(var(--ember))" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(28 16% 20%)" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="hsl(32 10% 63%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="hsl(32 10% 63%)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "hsl(var(--ember) / 0.06)" }}
              contentStyle={tooltipStyle}
              formatter={(value: number) => [value, "Posts"]}
            />
            <Bar dataKey="posts" fill="url(#barEmber)" radius={[6, 6, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
