/**
 * Audio/Video Department Integration Tests
 *
 * Tests for AV equipment inventory, checkout/return, damage reports,
 * hazard assessments, and safety briefings.
 *
 * Test Setup:
 *   1. Register a department overseer (isOverseer: true)
 *   2. Create a test event via Prisma
 *   3. Purchase AUDIO department (gives overseer event access)
 *   4. Create a volunteer user with EventVolunteer record
 *   5. Create an area for equipment filtering tests
 *
 * Authorization:
 *   - Equipment CRUD / hazard / briefings: Overseer with event access
 *   - Checkout / return / damage report: Overseer OR event volunteer
 *   - Equipment queries: Overseer OR event volunteer
 *   - Safety briefing queries: Overseer only (myAVSafetyBriefings: volunteer)
 */
import request from 'supertest';
import { createTestApp, closeTestApp } from '../setup.js';
import { createTestEvent, createTestVolunteerUser, registerTestUser } from '../testHelpers.js';
import prisma from '../../config/database.js';
import type { Application } from 'express';

let app: Application;

describe('Audio/Video Department', () => {
  let overseerToken: string;
  let volunteerToken: string;
  let eventId: string;
  let departmentId: string;
  let eventVolunteerId: string;
  let areaId: string;

  // Shared IDs populated during tests
  let equipmentId: string;
  let secondEquipmentId: string;
  let checkoutId: string;
  let damageReportId: string;
  let hazardAssessmentId: string;
  let briefingId: string;

  beforeAll(async () => {
    app = await createTestApp();

    // 1. Register overseer
    overseerToken = (await registerTestUser(app, {
      firstName: 'AV', lastName: 'Overseer', isOverseer: true,
    })).accessToken;

    // 2. Create test event
    eventId = await createTestEvent();

    // 3. Purchase AUDIO department
    const purchaseRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${overseerToken}`)
      .send({
        query: `mutation($input: PurchaseDepartmentInput!) {
          purchaseDepartment(input: $input) { id }
        }`,
        variables: { input: { eventId, departmentType: 'AUDIO' } },
      });

    if (purchaseRes.body.errors) {
      console.error('Purchase failed:', purchaseRes.body.errors);
      return;
    }
    departmentId = purchaseRes.body.data.purchaseDepartment.id;

    // 4. Create volunteer user
    const vol = await createTestVolunteerUser(app, eventId, departmentId);
    volunteerToken = vol.accessToken;
    eventVolunteerId = vol.eventVolunteerId;

    // 5. Create an area for filtering tests
    const area = await prisma.area.create({
      data: {
        name: 'Test AV Area',
        departmentId,
      },
    });
    areaId = area.id;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  // ── Equipment CRUD ──────────────────────────────────────

  describe('AV Equipment', () => {
    describe('createAVEquipment', () => {
      it('should create equipment with required fields', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($input: CreateAVEquipmentInput!) {
              createAVEquipment(input: $input) {
                id name category condition
              }
            }`,
            variables: {
              input: {
                eventId,
                name: 'PTZ Camera 1',
                category: 'CAMERA_PTZ',
              },
            },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.createAVEquipment.name).toBe('PTZ Camera 1');
        expect(response.body.data.createAVEquipment.category).toBe('CAMERA_PTZ');
        expect(response.body.data.createAVEquipment.condition).toBe('GOOD');
        equipmentId = response.body.data.createAVEquipment.id;
      });

      it('should create equipment with all optional fields', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($input: CreateAVEquipmentInput!) {
              createAVEquipment(input: $input) {
                id name model serialNumber category condition location notes
              }
            }`,
            variables: {
              input: {
                eventId,
                name: 'Audio Mixer',
                category: 'AUDIO_MIXER',
                model: 'Yamaha TF5',
                serialNumber: 'SN-12345',
                location: 'Sound Booth',
                notes: 'Primary mixer',
                areaId,
              },
            },
          });

        expect(response.body.errors).toBeUndefined();
        const item = response.body.data.createAVEquipment;
        expect(item.name).toBe('Audio Mixer');
        expect(item.model).toBe('Yamaha TF5');
        expect(item.serialNumber).toBe('SN-12345');
        expect(item.location).toBe('Sound Booth');
        expect(item.notes).toBe('Primary mixer');
        secondEquipmentId = item.id;
      });

      it('should reject unauthenticated request', async () => {
        const response = await request(app)
          .post('/graphql')
          .send({
            query: `mutation($input: CreateAVEquipmentInput!) {
              createAVEquipment(input: $input) { id }
            }`,
            variables: {
              input: { eventId, name: 'Unauthorized', category: 'CABLE' },
            },
          });

        expect(response.body.errors).toBeDefined();
      });

      it('should reject volunteer (requires overseer)', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `mutation($input: CreateAVEquipmentInput!) {
              createAVEquipment(input: $input) { id }
            }`,
            variables: {
              input: { eventId, name: 'Unauthorized', category: 'CABLE' },
            },
          });

        expect(response.body.errors).toBeDefined();
      });
    });

    describe('bulkCreateAVEquipment', () => {
      it('should create multiple equipment items', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($input: BulkCreateAVEquipmentInput!) {
              bulkCreateAVEquipment(input: $input) {
                id name category
              }
            }`,
            variables: {
              input: {
                eventId,
                items: [
                  { name: 'Mic 1', category: 'MICROPHONE' },
                  { name: 'Mic 2', category: 'MICROPHONE' },
                  { name: 'Cable A', category: 'CABLE' },
                ],
              },
            },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.bulkCreateAVEquipment).toHaveLength(3);
      });
    });

    describe('avEquipment query', () => {
      it('should return all equipment for event', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!) {
              avEquipment(eventId: $eventId) {
                id name category condition
              }
            }`,
            variables: { eventId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.avEquipment.length).toBeGreaterThanOrEqual(5);
      });

      it('should filter by category', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!, $category: AVEquipmentCategory) {
              avEquipment(eventId: $eventId, category: $category) {
                id name category
              }
            }`,
            variables: { eventId, category: 'MICROPHONE' },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.avEquipment.length).toBe(2);
        response.body.data.avEquipment.forEach((item: any) => {
          expect(item.category).toBe('MICROPHONE');
        });
      });

      it('should filter by areaId', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!, $areaId: ID) {
              avEquipment(eventId: $eventId, areaId: $areaId) {
                id name
              }
            }`,
            variables: { eventId, areaId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.avEquipment.length).toBe(1);
        expect(response.body.data.avEquipment[0].name).toBe('Audio Mixer');
      });

      it('should allow volunteer to query (dual auth)', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `query($eventId: ID!) {
              avEquipment(eventId: $eventId) { id name }
            }`,
            variables: { eventId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.avEquipment.length).toBeGreaterThanOrEqual(5);
      });
    });

    describe('avEquipmentItem query', () => {
      it('should return single item with nested details', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($id: ID!) {
              avEquipmentItem(id: $id) {
                id name category condition
                currentCheckout { id }
                checkoutHistory { id }
                damageReports { id }
              }
            }`,
            variables: { id: equipmentId },
          });

        expect(response.body.errors).toBeUndefined();
        const item = response.body.data.avEquipmentItem;
        expect(item.id).toBe(equipmentId);
        expect(item.currentCheckout).toBeNull();
        expect(item.checkoutHistory).toHaveLength(0);
        expect(item.damageReports).toHaveLength(0);
      });
    });

    describe('updateAVEquipment', () => {
      it('should update equipment fields (patch-style)', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($id: ID!, $input: UpdateAVEquipmentInput!) {
              updateAVEquipment(id: $id, input: $input) {
                id name location
              }
            }`,
            variables: {
              id: equipmentId,
              input: { location: 'Main Hall' },
            },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.updateAVEquipment.location).toBe('Main Hall');
        expect(response.body.data.updateAVEquipment.name).toBe('PTZ Camera 1');
      });
    });

    describe('avEquipmentSummary', () => {
      it('should return aggregate stats by category', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!) {
              avEquipmentSummary(eventId: $eventId) {
                totalItems checkedOutCount needsRepairCount outOfServiceCount
                byCategory { category count checkedOutCount }
              }
            }`,
            variables: { eventId },
          });

        expect(response.body.errors).toBeUndefined();
        const summary = response.body.data.avEquipmentSummary;
        expect(summary.totalItems).toBeGreaterThanOrEqual(5);
        expect(summary.checkedOutCount).toBe(0);
        expect(Array.isArray(summary.byCategory)).toBe(true);
      });
    });
  });

  // ── Checkout / Return ───────────────────────────────────

  describe('AV Equipment Checkout', () => {
    describe('checkoutEquipment', () => {
      it('should checkout equipment to a volunteer', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($input: CheckoutEquipmentInput!) {
              checkoutEquipment(input: $input) {
                id checkedOutAt checkedInAt notes
                equipment { id name }
                checkedOutBy { id }
              }
            }`,
            variables: {
              input: {
                equipmentId,
                checkedOutById: eventVolunteerId,
                notes: 'For morning session',
              },
            },
          });

        expect(response.body.errors).toBeUndefined();
        const checkout = response.body.data.checkoutEquipment;
        expect(checkout.checkedOutAt).toBeDefined();
        expect(checkout.checkedInAt).toBeNull();
        expect(checkout.notes).toBe('For morning session');
        expect(checkout.equipment.id).toBe(equipmentId);
        expect(checkout.checkedOutBy.id).toBe(eventVolunteerId);
        checkoutId = checkout.id;
      });

      it('should reject double checkout (equipment already checked out)', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($input: CheckoutEquipmentInput!) {
              checkoutEquipment(input: $input) { id }
            }`,
            variables: {
              input: {
                equipmentId,
                checkedOutById: eventVolunteerId,
              },
            },
          });

        expect(response.body.errors).toBeDefined();
        expect(response.body.errors[0].message).toContain('already checked out');
      });

      it('should allow volunteer to checkout (dual auth)', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `mutation($input: CheckoutEquipmentInput!) {
              checkoutEquipment(input: $input) { id }
            }`,
            variables: {
              input: {
                equipmentId: secondEquipmentId,
                checkedOutById: eventVolunteerId,
              },
            },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.checkoutEquipment.id).toBeDefined();
      });
    });

    describe('avEquipmentCheckouts query', () => {
      it('should return all checkouts', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!) {
              avEquipmentCheckouts(eventId: $eventId) {
                id checkedOutAt checkedInAt
                equipment { id name }
              }
            }`,
            variables: { eventId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.avEquipmentCheckouts.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter by checkedIn = false (still checked out)', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!, $checkedIn: Boolean) {
              avEquipmentCheckouts(eventId: $eventId, checkedIn: $checkedIn) {
                id checkedInAt
              }
            }`,
            variables: { eventId, checkedIn: false },
          });

        expect(response.body.errors).toBeUndefined();
        response.body.data.avEquipmentCheckouts.forEach((co: any) => {
          expect(co.checkedInAt).toBeNull();
        });
      });
    });

    describe('returnEquipment', () => {
      it('should return checked-out equipment', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($checkoutId: ID!) {
              returnEquipment(checkoutId: $checkoutId) {
                id checkedInAt
              }
            }`,
            variables: { checkoutId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.returnEquipment.checkedInAt).toBeDefined();
      });

      it('should reject returning already-returned equipment', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($checkoutId: ID!) {
              returnEquipment(checkoutId: $checkoutId) { id }
            }`,
            variables: { checkoutId },
          });

        expect(response.body.errors).toBeDefined();
        expect(response.body.errors[0].message).toContain('already');
      });
    });

    describe('avEquipmentCheckouts filtered by returned', () => {
      it('should filter by checkedIn = true (returned)', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!, $checkedIn: Boolean) {
              avEquipmentCheckouts(eventId: $eventId, checkedIn: $checkedIn) {
                id checkedInAt
              }
            }`,
            variables: { eventId, checkedIn: true },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.avEquipmentCheckouts.length).toBeGreaterThanOrEqual(1);
        response.body.data.avEquipmentCheckouts.forEach((co: any) => {
          expect(co.checkedInAt).toBeDefined();
        });
      });
    });
  });

  // ── Damage Reports ──────────────────────────────────────

  describe('AV Damage Reports', () => {
    describe('reportAVDamage', () => {
      it('should create a damage report (volunteer can report)', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `mutation($input: ReportAVDamageInput!) {
              reportAVDamage(input: $input) {
                id description severity resolved
                equipment { id name }
                reportedBy { id }
              }
            }`,
            variables: {
              input: {
                equipmentId,
                description: 'Lens is scratched',
                severity: 'MINOR',
              },
            },
          });

        expect(response.body.errors).toBeUndefined();
        const report = response.body.data.reportAVDamage;
        expect(report.description).toBe('Lens is scratched');
        expect(report.severity).toBe('MINOR');
        expect(report.resolved).toBe(false);
        expect(report.equipment.id).toBe(equipmentId);
        damageReportId = report.id;
      });

      it('should accept SEVERE severity', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `mutation($input: ReportAVDamageInput!) {
              reportAVDamage(input: $input) {
                id severity
              }
            }`,
            variables: {
              input: {
                equipmentId: secondEquipmentId,
                description: 'Completely broken',
                severity: 'SEVERE',
              },
            },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.reportAVDamage.severity).toBe('SEVERE');
      });
    });

    describe('avDamageReports query', () => {
      it('should return all damage reports', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!) {
              avDamageReports(eventId: $eventId) {
                id description severity resolved
              }
            }`,
            variables: { eventId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.avDamageReports.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter by resolved = false', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!, $resolved: Boolean) {
              avDamageReports(eventId: $eventId, resolved: $resolved) {
                id resolved
              }
            }`,
            variables: { eventId, resolved: false },
          });

        expect(response.body.errors).toBeUndefined();
        response.body.data.avDamageReports.forEach((r: any) => {
          expect(r.resolved).toBe(false);
        });
      });
    });

    describe('resolveAVDamage', () => {
      it('should resolve damage and update equipment condition (MINOR → NEEDS_REPAIR)', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($id: ID!, $resolutionNotes: String) {
              resolveAVDamage(id: $id, resolutionNotes: $resolutionNotes) {
                id resolved resolvedAt resolutionNotes
                equipment { id condition }
              }
            }`,
            variables: {
              id: damageReportId,
              resolutionNotes: 'Lens replaced',
            },
          });

        expect(response.body.errors).toBeUndefined();
        const resolved = response.body.data.resolveAVDamage;
        expect(resolved.resolved).toBe(true);
        expect(resolved.resolvedAt).toBeDefined();
        expect(resolved.resolutionNotes).toBe('Lens replaced');
        expect(resolved.equipment.condition).toBe('NEEDS_REPAIR');
      });

      it('should reject volunteer (requires overseer)', async () => {
        // Create a new damage report to resolve
        const reportRes = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `mutation($input: ReportAVDamageInput!) {
              reportAVDamage(input: $input) { id }
            }`,
            variables: {
              input: {
                equipmentId,
                description: 'Minor scratch',
                severity: 'MINOR',
              },
            },
          });

        const newReportId = reportRes.body.data.reportAVDamage.id;

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `mutation($id: ID!) {
              resolveAVDamage(id: $id) { id }
            }`,
            variables: { id: newReportId },
          });

        expect(response.body.errors).toBeDefined();
      });
    });

    describe('resolveAVDamage (SEVERE → OUT_OF_SERVICE)', () => {
      it('should set OUT_OF_SERVICE for SEVERE damage', async () => {
        // Report SEVERE damage on a fresh piece of equipment
        const createRes = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($input: CreateAVEquipmentInput!) {
              createAVEquipment(input: $input) { id }
            }`,
            variables: {
              input: { eventId, name: 'Severity Test Item', category: 'CABLE' },
            },
          });
        const testItemId = createRes.body.data.createAVEquipment.id;

        const reportRes = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `mutation($input: ReportAVDamageInput!) {
              reportAVDamage(input: $input) { id }
            }`,
            variables: {
              input: {
                equipmentId: testItemId,
                description: 'Completely shattered',
                severity: 'SEVERE',
              },
            },
          });

        const severeReportId = reportRes.body.data.reportAVDamage.id;

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($id: ID!) {
              resolveAVDamage(id: $id) {
                id resolved
                equipment { id condition }
              }
            }`,
            variables: { id: severeReportId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.resolveAVDamage.resolved).toBe(true);
        expect(response.body.data.resolveAVDamage.equipment.condition).toBe('OUT_OF_SERVICE');
      });
    });
  });

  // ── Hazard Assessments ──────────────────────────────────

  describe('AV Hazard Assessments', () => {
    describe('createAVHazardAssessment', () => {
      it('should create a hazard assessment', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($input: CreateAVHazardAssessmentInput!) {
              createAVHazardAssessment(input: $input) {
                id title hazardType description controls ppeRequired completedAt
              }
            }`,
            variables: {
              input: {
                eventId,
                title: 'Rigging LED panels',
                hazardType: 'WORKING_AT_HEIGHT',
                description: 'Installing LED panels above stage area',
                controls: 'Use harness, spotter, secure tools',
                ppeRequired: ['Hard hat', 'Safety harness'],
              },
            },
          });

        expect(response.body.errors).toBeUndefined();
        const assessment = response.body.data.createAVHazardAssessment;
        expect(assessment.title).toBe('Rigging LED panels');
        expect(assessment.hazardType).toBe('WORKING_AT_HEIGHT');
        expect(assessment.ppeRequired).toEqual(['Hard hat', 'Safety harness']);
        expect(assessment.completedAt).toBeDefined();
        hazardAssessmentId = assessment.id;
      });

      it('should reject volunteer (requires overseer)', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `mutation($input: CreateAVHazardAssessmentInput!) {
              createAVHazardAssessment(input: $input) { id }
            }`,
            variables: {
              input: {
                eventId,
                title: 'Unauthorized',
                hazardType: 'HEAVY_LIFTING',
                description: 'Test',
                controls: 'Test',
                ppeRequired: [],
              },
            },
          });

        expect(response.body.errors).toBeDefined();
      });
    });

    describe('avHazardAssessments query', () => {
      it('should return all assessments for event', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!) {
              avHazardAssessments(eventId: $eventId) {
                id title hazardType
              }
            }`,
            variables: { eventId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.avHazardAssessments.length).toBeGreaterThanOrEqual(1);
      });

      it('should allow volunteer to query', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `query($eventId: ID!) {
              avHazardAssessments(eventId: $eventId) { id title }
            }`,
            variables: { eventId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.avHazardAssessments.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('deleteAVHazardAssessment', () => {
      it('should delete assessment', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($id: ID!) {
              deleteAVHazardAssessment(id: $id)
            }`,
            variables: { id: hazardAssessmentId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.deleteAVHazardAssessment).toBe(true);

        // Verify deleted
        const checkRes = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!) {
              avHazardAssessments(eventId: $eventId) { id }
            }`,
            variables: { eventId },
          });

        const ids = checkRes.body.data.avHazardAssessments.map((a: any) => a.id);
        expect(ids).not.toContain(hazardAssessmentId);
      });
    });
  });

  // ── Safety Briefings ────────────────────────────────────

  describe('AV Safety Briefings', () => {
    describe('createAVSafetyBriefing', () => {
      it('should create briefing with attendees', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($input: CreateAVSafetyBriefingInput!) {
              createAVSafetyBriefing(input: $input) {
                id topic notes conductedAt attendeeCount
                attendees {
                  id
                  eventVolunteer { id }
                }
              }
            }`,
            variables: {
              input: {
                eventId,
                topic: 'Morning Safety Briefing',
                notes: 'Review electrical safety procedures',
                attendeeIds: [eventVolunteerId],
              },
            },
          });

        expect(response.body.errors).toBeUndefined();
        const briefing = response.body.data.createAVSafetyBriefing;
        expect(briefing.topic).toBe('Morning Safety Briefing');
        expect(briefing.notes).toBe('Review electrical safety procedures');
        expect(briefing.conductedAt).toBeDefined();
        expect(briefing.attendeeCount).toBe(1);
        expect(briefing.attendees).toHaveLength(1);
        expect(briefing.attendees[0].eventVolunteer.id).toBe(eventVolunteerId);
        briefingId = briefing.id;
      });
    });

    describe('updateAVSafetyBriefingNotes', () => {
      it('should update briefing notes', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($id: ID!, $notes: String!) {
              updateAVSafetyBriefingNotes(id: $id, notes: $notes) {
                id notes
              }
            }`,
            variables: {
              id: briefingId,
              notes: 'Updated: Include ladder safety',
            },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.updateAVSafetyBriefingNotes.notes).toBe(
          'Updated: Include ladder safety'
        );
      });
    });

    describe('avSafetyBriefings query', () => {
      it('should return briefings (overseer only)', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!) {
              avSafetyBriefings(eventId: $eventId) {
                id topic attendeeCount
              }
            }`,
            variables: { eventId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.avSafetyBriefings.length).toBeGreaterThanOrEqual(1);
      });

      it('should reject volunteer', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `query($eventId: ID!) {
              avSafetyBriefings(eventId: $eventId) { id }
            }`,
            variables: { eventId },
          });

        expect(response.body.errors).toBeDefined();
      });
    });

    describe('myAVSafetyBriefings query', () => {
      it('should return only briefings the volunteer attended', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${volunteerToken}`)
          .send({
            query: `query($eventId: ID!) {
              myAVSafetyBriefings(eventId: $eventId) {
                id topic attendeeCount
              }
            }`,
            variables: { eventId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.myAVSafetyBriefings.length).toBe(1);
        expect(response.body.data.myAVSafetyBriefings[0].topic).toBe('Morning Safety Briefing');
      });

      it('should return empty for volunteer who has not attended any', async () => {
        // Create a second volunteer who hasn't attended any briefings
        const vol2 = await createTestVolunteerUser(app, eventId, departmentId);

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${vol2.accessToken}`)
          .send({
            query: `query($eventId: ID!) {
              myAVSafetyBriefings(eventId: $eventId) { id }
            }`,
            variables: { eventId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.myAVSafetyBriefings).toHaveLength(0);
      });
    });

    describe('deleteAVSafetyBriefing', () => {
      it('should delete briefing and cascade attendees', async () => {
        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `mutation($id: ID!) {
              deleteAVSafetyBriefing(id: $id)
            }`,
            variables: { id: briefingId },
          });

        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.deleteAVSafetyBriefing).toBe(true);

        // Verify briefing deleted
        const checkRes = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${overseerToken}`)
          .send({
            query: `query($eventId: ID!) {
              avSafetyBriefings(eventId: $eventId) { id }
            }`,
            variables: { eventId },
          });

        const ids = checkRes.body.data.avSafetyBriefings.map((b: any) => b.id);
        expect(ids).not.toContain(briefingId);
      });
    });
  });

  // ── Equipment Deletion ──────────────────────────────────

  describe('deleteAVEquipment', () => {
    it('should delete equipment and cascade checkouts/damage', async () => {
      // Create a throwaway piece of equipment with a checkout and damage report
      const createRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${overseerToken}`)
        .send({
          query: `mutation($input: CreateAVEquipmentInput!) {
            createAVEquipment(input: $input) { id }
          }`,
          variables: {
            input: { eventId, name: 'Delete Test Item', category: 'ACCESSORY' },
          },
        });
      const deleteItemId = createRes.body.data.createAVEquipment.id;

      // Checkout the item
      await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${overseerToken}`)
        .send({
          query: `mutation($input: CheckoutEquipmentInput!) {
            checkoutEquipment(input: $input) { id }
          }`,
          variables: {
            input: { equipmentId: deleteItemId, checkedOutById: eventVolunteerId },
          },
        });

      // Report damage on it
      await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${volunteerToken}`)
        .send({
          query: `mutation($input: ReportAVDamageInput!) {
            reportAVDamage(input: $input) { id }
          }`,
          variables: {
            input: {
              equipmentId: deleteItemId,
              description: 'Test damage',
              severity: 'MINOR',
            },
          },
        });

      // Delete the equipment
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${overseerToken}`)
        .send({
          query: `mutation($id: ID!) {
            deleteAVEquipment(id: $id)
          }`,
          variables: { id: deleteItemId },
        });

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.deleteAVEquipment).toBe(true);

      // Verify it's gone
      const checkRes = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${overseerToken}`)
        .send({
          query: `query($id: ID!) {
            avEquipmentItem(id: $id) { id }
          }`,
          variables: { id: deleteItemId },
        });

      expect(checkRes.body.data.avEquipmentItem).toBeNull();
    });
  });
});
