<template>
  <div class="detail-block">
    <div class="detail-row">
      <div class="detail-item">
        <span class="detail-label">Position Title</span>
        <span class="detail-val">{{ pub.position }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Plantilla Item No.</span>
        <span class="detail-val">{{ pub.plantilla_item || '—' }}</span>
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-item">
        <span class="detail-label">Salary Grade</span>
        <span class="detail-val">{{ pub.salary_grade ? `SG-${pub.salary_grade}` : '—' }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Monthly Salary</span>
        <span class="detail-val">{{ pub.monthly_salary || '—' }}</span>
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-item">
        <span class="detail-label">Office</span>
        <span class="detail-val">{{ pub.department }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Place of Assignment</span>
        <span class="detail-val">{{ pub.place_of_assignment || '—' }}</span>
      </div>
    </div>

    <div class="detail-divider">Qualifications</div>
    <div class="detail-row">
      <div class="detail-item full">
        <span class="detail-label">Education</span>
        <span class="detail-val">{{ pub.education || '—' }}</span>
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-item full">
        <span class="detail-label">Training</span>
        <span class="detail-val">{{ pub.training || '—' }}</span>
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-item full">
        <span class="detail-label">Experience</span>
        <span class="detail-val">{{ pub.experience || '—' }}</span>
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-item">
        <span class="detail-label">Eligibility</span>
        <span class="detail-val">{{ pub.eligibility || '—' }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Competency</span>
        <span class="detail-val">{{ pub.competency || '—' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ pub: { type: Object, required: true } })
</script>

<style scoped>
.detail-block { display: flex; flex-direction: column; gap: 2px; }
.detail-row   { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
.detail-item  { flex: 1; min-width: 140px; }
.detail-item.full { flex-basis: 100%; }
.detail-label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .4px; color: var(--text-3); margin-bottom: 2px; }
.detail-val   { display: block; font-size: 14px; color: var(--text-1); }
.detail-divider {
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px;
  color: var(--text-3); border-bottom: 1px solid var(--border); padding-bottom: 6px;
  margin: 14px 0 10px;
}
</style>
