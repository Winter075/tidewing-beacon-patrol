import * as THREE from '../vendor/three.module.min.js';

const MIN_SPEED = 18;
const MAX_SPEED = 118;

function approach(current, target, step) {
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
}

function angleDistance(a, b) {
  let delta = (a - b) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export class FlightModel {
  constructor(world) {
    this.world = world;
    this.position = new THREE.Vector3(-1060, 300, 500);
    this.heading = Math.PI / 2;
    this.pitch = 0.04;
    this.bank = 0;
    this.speed = 58;
    this.throttle = 0.72;
    this.fuel = 100;
    this.hull = 100;
    this.verticalSpeed = 0;
    this.elapsed = 0;
    this.gearDown = true;
    this.landed = false;
    this.crashed = false;
    this.lastImpact = '';
  }

  reset() {
    this.position.set(-1060, 300, 500);
    this.heading = Math.PI / 2;
    this.pitch = 0.04;
    this.bank = 0;
    this.speed = 58;
    this.throttle = 0.72;
    this.fuel = 100;
    this.hull = 100;
    this.verticalSpeed = 0;
    this.elapsed = 0;
    this.gearDown = true;
    this.landed = false;
    this.crashed = false;
    this.lastImpact = '';
  }

  setPose(pose) {
    this.position.set(pose.x, pose.y, pose.z);
    this.heading = pose.heading ?? this.heading;
    this.pitch = pose.pitch ?? this.pitch;
    this.bank = pose.bank ?? this.bank;
    this.speed = pose.speed ?? this.speed;
    this.throttle = pose.throttle ?? this.throttle;
    this.fuel = pose.fuel ?? this.fuel;
    this.hull = pose.hull ?? this.hull;
    this.gearDown = pose.gearDown ?? true;
  }

  runwayAlignment(runway) {
    const dx = this.position.x - runway.center.x;
    const dz = this.position.z - runway.center.z;
    const along = dx * Math.sin(runway.heading) - dz * Math.cos(runway.heading);
    const across = dx * Math.cos(runway.heading) + dz * Math.sin(runway.heading);
    const headingError = Math.min(Math.abs(angleDistance(this.heading, runway.heading)), Math.abs(angleDistance(this.heading, runway.heading + Math.PI)));
    return { along, across, headingError, onStrip: Math.abs(along) < runway.length / 2 && Math.abs(across) < runway.width / 2 };
  }

  update(dt, input, events) {
    if (this.landed || this.crashed) return;
    this.elapsed += dt;

    this.throttle = THREE.MathUtils.clamp(this.throttle + input.throttleDelta * dt * 0.45, 0, 1);
    if (this.fuel <= 0) this.throttle = 0;

    const targetPitch = input.pitch * 0.44;
    const targetBank = input.bank * 1.02;
    this.pitch = approach(this.pitch, targetPitch, dt * 1.25);
    this.bank = approach(this.bank, targetBank, dt * 1.65);

    const liftEfficiency = THREE.MathUtils.clamp(this.speed / 52, 0, 1.18) * Math.cos(this.bank * 0.8);
    const engineForce = this.throttle * 15.5;
    const drag = 0.0032 * this.speed * this.speed + 0.22;
    const gravityPull = Math.sin(this.pitch) * 11.5 * (1.2 - liftEfficiency);
    this.speed = THREE.MathUtils.clamp(this.speed + (engineForce - drag - gravityPull) * dt, MIN_SPEED, MAX_SPEED);

    const turnRate = (Math.tan(this.bank) * 9.81 / this.speed) * 0.95 + input.rudder * 0.22;
    this.heading = (this.heading + turnRate * dt + Math.PI * 4) % (Math.PI * 2);
    this.verticalSpeed = this.speed * Math.sin(this.pitch) * liftEfficiency - (1 - liftEfficiency) * 11;

    const horizontal = this.speed * Math.cos(this.pitch) * dt;
    this.position.x += Math.sin(this.heading) * horizontal;
    this.position.z -= Math.cos(this.heading) * horizontal;
    this.position.y += this.verticalSpeed * dt;

    this.fuel = Math.max(0, this.fuel - this.throttle * 0.085 * dt);

    const ground = Math.max(0, this.world.heightAt(this.position.x, this.position.z));
    const clearance = this.position.y - ground;
    if (clearance < 2.6) {
      const alignment = this.runwayAlignment(this.world.runway);
      const gentle = this.verticalSpeed > -8 && Math.abs(this.bank) < 0.32 && this.speed < 62;
      if (alignment.onStrip && alignment.headingError < 0.22 && gentle && this.gearDown) {
        this.position.y = ground + 2.6;
        this.verticalSpeed = 0;
        this.landed = true;
        this.speed = 0;
        events.push({ type: 'landed', quality: this.hull > 80 ? 'clean' : 'firm' });
        return;
      }
      this.position.y = ground + 2.6;
      const force = Math.max(0, -this.verticalSpeed) + this.speed * 0.22;
      this.hull -= Math.min(62, force * 1.8);
      this.speed *= 0.68;
      this.lastImpact = ground < 1 ? 'The tide took the wheels.' : 'The airframe hit the ground hard.';
      events.push({ type: 'impact', force });
      if (this.hull <= 0) {
        this.hull = 0;
        this.crashed = true;
      }
    }
    if (this.position.y > 2200) this.position.y = 2200;
    if (this.hull <= 0) {
      this.hull = 0;
      this.crashed = true;
    }
  }

  headingDegrees() {
    return Math.round(((this.heading * 180) / Math.PI) % 360);
  }
}
