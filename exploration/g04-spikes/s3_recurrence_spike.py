#!/usr/bin/env python3
"""G0.4 S3 — recurrence identity / exception / Today acknowledgement spike.

EXPLORATION / NOT CANONICAL ARCHITECTURE / NOT PRODUCTION COMMITMENT

This is a domain-contract probe, not a production recurrence engine.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, replace
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo


@dataclass(frozen=True)
class Series:
    id: str
    weekday: int
    local_time_hm: tuple[int, int]
    timezone_name: str


@dataclass(frozen=True)
class Occurrence:
    series_id: str
    original_local_start: datetime  # naive wall-clock identity anchor
    current_local_start: datetime   # naive wall-clock display time
    deleted: bool = False

    @property
    def identity(self) -> str:
        return f"{self.series_id}|{self.original_local_start.isoformat(timespec='minutes')}"


def generate_weekly(series: Series, start_date: date, count: int) -> list[Occurrence]:
    d = start_date
    while d.weekday() != series.weekday:
        d += timedelta(days=1)
    h, m = series.local_time_hm
    out = []
    for i in range(count):
        local = datetime(d.year, d.month, d.day, h, m)
        out.append(Occurrence(series.id, local, local))
        d += timedelta(days=7)
    return out


def apply_edit(occ: Occurrence, new_local_start: datetime) -> Occurrence:
    # Crucial contract: current start changes, original identity anchor does not.
    return replace(occ, current_local_start=new_local_start)


def apply_delete(occ: Occurrence) -> Occurrence:
    return replace(occ, deleted=True)


def project_today(occurrences: list[Occurrence], exceptions: dict[str, Occurrence], day: date):
    projected = []
    for base in occurrences:
        effective = exceptions.get(base.identity, base)
        if effective.deleted:
            continue
        if effective.current_local_start.date() == day:
            projected.append(effective)
    return projected


def main() -> int:
    out = {"spike": "S3", "status": "PASS", "checks": {}}

    series = Series(
        id="series-cpa-weekly",
        weekday=0,  # Monday
        local_time_hm=(9, 0),
        timezone_name="America/Los_Angeles",
    )
    base = generate_weekly(series, date(2026, 9, 7), 4)
    assert [o.original_local_start.date().isoformat() for o in base] == [
        "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"
    ]
    out["checks"]["dynamic_weekly_occurrence_projection"] = True

    original_914 = base[1]
    original_identity = original_914.identity
    moved = apply_edit(original_914, datetime(2026, 9, 15, 15, 0))
    assert moved.identity == original_identity
    assert moved.current_local_start != moved.original_local_start
    out["checks"]["single_edit_preserves_original_identity"] = True

    deleted = apply_delete(base[2])
    assert deleted.identity == base[2].identity and deleted.deleted
    out["checks"]["single_delete_is_exception_not_series_delete"] = True

    exceptions = {moved.identity: moved, deleted.identity: deleted}
    day_915 = project_today(base, exceptions, date(2026, 9, 15))
    assert len(day_915) == 1 and day_915[0].identity == original_identity
    day_921 = project_today(base, exceptions, date(2026, 9, 21))
    assert day_921 == []
    out["checks"]["today_projection_honors_move_and_delete_exceptions"] = True

    # Narrow Today acknowledgement uses displayed local day + stable source identity.
    ack_key = f"2026-09-15|{day_915[0].identity}"
    persisted_ack = {ack_key: True}
    # 'Restart': reconstruct series + exceptions, then project again.
    reprojection = project_today(generate_weekly(series, date(2026, 9, 7), 4), exceptions, date(2026, 9, 15))
    assert len(reprojection) == 1
    assert persisted_ack[f"2026-09-15|{reprojection[0].identity}"] is True
    out["checks"]["today_ack_survives_reprojection_without_mutating_series"] = True

    # Date-only is a calendar date, not midnight UTC.
    memo_date = date(2026, 9, 7)
    assert memo_date.isoformat() == "2026-09-07"
    # Demonstrate why midnight-UTC encoding is not equivalent for negative offsets.
    utc_midnight = datetime(2026, 9, 7, 0, 0, tzinfo=timezone.utc)
    los_angeles = ZoneInfo("America/Los_Angeles")
    assert utc_midnight.astimezone(los_angeles).date().isoformat() == "2026-09-06"
    out["checks"]["date_only_must_not_be_midnight_utc"] = True

    # Local-wall-clock recurrence across DST: local 09:00 stays 09:00 while UTC offset changes.
    before = datetime(2026, 10, 26, 9, 0, tzinfo=los_angeles)
    after = datetime(2026, 11, 2, 9, 0, tzinfo=los_angeles)  # after US DST fall-back
    assert before.hour == after.hour == 9
    assert before.utcoffset() != after.utcoffset()
    assert before.astimezone(timezone.utc).hour != after.astimezone(timezone.utc).hour
    out["checks"]["local_time_recurrence_survives_dst_offset_change"] = True

    # Whole-series mutation with existing exceptions is intentionally unresolved by this spike.
    out["open_contract"] = (
        "Whole-series edit when prior occurrence exceptions exist remains a G0.5 policy decision; "
        "S3 confirms the identity seam but does not choose exception remapping/reset semantics."
    )
    out["sample_occurrence_identity"] = original_identity
    out["sample_today_ack_key"] = ack_key
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
